// lib/solver/index.js
import { buildLevelMap } from "./subgroups.js";
import { expandByLevel } from "./expand.js";
import { buildTimeGrid, buildDomains } from "./domains.js";
import { solveWithRestarts } from "./backtrack.js";
import { anneal } from "./anneal.js";
import { getDb } from "../db.js";

/**
 * Run the solver per level and return one schedule per level.
 * Each level is solved independently so conflicts between levels
 * (shared staff) are detected and resolved separately.
 *
 * Availability relaxation: if strict availability blocks sessions,
 * retry with all campus days open, then flag which levels were relaxed.
 *
 * Returns: { levelResults: [{ level, label, entries, stats }], overallStats }
 */
export async function runSolver(institutionId, termLabel) {
  const { ObjectId } = await import("mongodb");
  const db   = await getDb();
  const iOid = new ObjectId(institutionId);

  const [institution, courses, allAvail, levelsConfig] = await Promise.all([
    db.collection("institutions").findOne({ _id: iOid }),
    db.collection("courses").find({ institution_id: iOid, deleted_at: null }).toArray(),
    db.collection("availability").find({ institution_id: iOid, term_label: termLabel }).toArray(),
    db.collection("settings").findOne({ institution_id: iOid, type: "levels_config" }),
  ]);

  if (!institution) {
    const err = new Error("Institution not found"); err.status = 404; throw err;
  }
  if (!levelsConfig?.data?.levels?.length) {
    const err = new Error("No levels configured. Set up groups first."); err.status = 400; throw err;
  }
  if (!courses.length) {
    const err = new Error("No courses found."); err.status = 400; throw err;
  }

  const workingDays = institution.active_term?.working_days ?? [];
  const timeGrid    = buildTimeGrid(institution);

  // Strict availability: staff → their chosen days
  const strictAvailMap = new Map();
  for (const a of allAvail) {
    strictAvailMap.set(a.user_id.toString(), a.available_days ?? []);
  }

  // Relaxed: all campus working days for everyone
  const relaxedAvailMap = new Map();
  for (const a of allAvail) {
    relaxedAvailMap.set(a.user_id.toString(), workingDays);
  }

  const levelMap    = buildLevelMap(levelsConfig.data.levels);
  const byLevel     = expandByLevel(courses, levelMap);

  const levelResults = [];
  let totalSessions    = 0;
  let totalAssigned    = 0;

  // We share a global assignment context across levels so staff conflicts
  // between levels (same professor teaching L3 and L2) are respected.
  // The slot index is passed through level by level.
  const globalSlotIndex = new Map(); // "day|period" → [{ session, slot }]

  for (const [level, sessions] of byLevel) {
    const lvConfig = levelsConfig.data.levels.find(l => l.level === level);
    const label    = lvConfig?.label ?? `Level ${level}`;

    if (sessions.length === 0) {
      levelResults.push({ level, label, entries: [], stats: { totalSessions: 0, assignedSessions: 0, success: true, relaxed: false } });
      continue;
    }

    totalSessions += sessions.length;

    // Phase 1: try strict availability
    const { domains: strictDomains, infeasible: strictInfeasible } =
      buildDomains(sessions, timeGrid, strictAvailMap, institution);

    const needsRelaxation = strictInfeasible.length > 0;
    const domains = needsRelaxation
      ? buildDomains(sessions, timeGrid, relaxedAvailMap, institution).domains
      : strictDomains;

    // Phase 2: greedy + repair, respecting global slot index from previous levels
    const { assignment, success } = solveWithRestarts(
      sessions, domains, 3, globalSlotIndex
    );

    // Phase 3: SA polish (only if fully assigned)
    const finalAssignment = success
      ? anneal(assignment, domains, 600)
      : assignment;

    // Merge this level's assignment into global slot index
    for (const [sid, slot] of finalAssignment) {
      const session = sessions.find(s => s.id === sid);
      if (!session) continue;
      const key = `${slot.day}|${slot.period}`;
      if (!globalSlotIndex.has(key)) globalSlotIndex.set(key, []);
      globalSlotIndex.get(key).push({ session, slot });
    }

    const entries = [];
    for (const [, slot] of finalAssignment) {
      entries.push({
        course_id:      slot.course_id,
        course_code:    slot.course_code,
        course_name:    slot.course_name,
        session_type:   slot.session_type,
        level,
        room_code:      slot.room_code,
        staff_id:       slot.staff_id,
        day:            slot.day,
        period:         slot.period,
        start:          slot.start,
        end:            slot.end,
        subgroup:       slot.subgroup      ?? null,
        groups_covered: slot.groups_covered ?? [],
      });
    }

    totalAssigned += entries.length;

    levelResults.push({
      level,
      label,
      entries,
      stats: {
        totalSessions:    sessions.length,
        assignedSessions: entries.length,
        success,
        relaxed:          needsRelaxation,
        infeasibleCount:  needsRelaxation ? strictInfeasible.length : 0,
      },
    });
  }

  return {
    levelResults,
    overallStats: {
      totalSessions,
      totalAssigned,
      success: totalAssigned === totalSessions,
      levels:  levelResults.length,
    },
  };
}
