// lib/solver/index.js
import { buildLevelMap } from "./subgroups.js";
import { expandAll }     from "./expand.js";
import { buildTimeGrid, buildDomains } from "./domains.js";
import { solveWithRestarts } from "./backtrack.js";
import { anneal }        from "./anneal.js";
import { getDb }         from "../db.js";

/**
 * Run the full 3-phase solver for an institution's active term.
 *
 * Phase 1: AC-3 domain trimming
 * Phase 2: Greedy MCV backtracker with forward checking + restarts
 * Phase 3: Simulated annealing soft-constraint optimisation (800ms budget)
 *
 * @param {string} institutionId - string representation of ObjectId
 * @param {string} termLabel
 * @returns {{ entries: object[], infeasible: object[], stats: object }}
 */
export async function runSolver(institutionId, termLabel) {
  const { ObjectId } = await import("mongodb");
  const db   = await getDb();
  const iOid = new ObjectId(institutionId);

  // ── Load all required data in parallel ──────────────────────────────────────
  const [institution, courses, allAvail, levelsConfig] = await Promise.all([
    db.collection("institutions").findOne({ _id: iOid }),
    db.collection("courses").find({ institution_id: iOid, deleted_at: null }).toArray(),
    db.collection("availability").find({ institution_id: iOid, term_label: termLabel }).toArray(),
    db.collection("settings").findOne({ institution_id: iOid, type: "levels_config" }),
  ]);

  if (!institution) {
    const err = new Error("Institution not found");
    err.status = 404;
    throw err;
  }
  if (!levelsConfig?.data?.levels?.length) {
    const err = new Error("No levels configured. Set up groups first.");
    err.status = 400;
    throw err;
  }
  if (!courses.length) {
    const err = new Error("No courses found.");
    err.status = 400;
    throw err;
  }

  // ── Build availability map: staffId (string) → available_days[] ─────────────
  const availabilityMap = new Map();
  for (const a of allAvail) {
    availabilityMap.set(a.user_id.toString(), a.available_days ?? []);
  }

  // ── Phase 0: Expand courses into sessions (descending level order) ───────────
  const levelMap = buildLevelMap(levelsConfig.data.levels);
  const sessions = expandAll(courses, levelMap);

  if (sessions.length === 0) {
    const err = new Error("No sessions to schedule after expansion. Check course session types.");
    err.status = 400;
    throw err;
  }

  // ── Phase 1: AC-3 domain trimming ────────────────────────────────────────────
  const timeGrid = buildTimeGrid(institution);
  const { domains, infeasible } = buildDomains(sessions, timeGrid, availabilityMap, institution);

  if (infeasible.length > 0) {
    return {
      entries:    [],
      infeasible,
      stats: {
        totalSessions:    sessions.length,
        assignedSessions: 0,
        success:          false,
        restarts:         0,
        backtracks:       0,
        phase:            "domain_trimming",
      },
    };
  }

  // ── Phase 2: Backtracker ──────────────────────────────────────────────────────
  const { assignment, success, restarts, backtracks } = solveWithRestarts(sessions, domains);

  // ── Phase 3: SA post-processing (only on feasible solutions) ─────────────────
  const finalAssignment = success
    ? anneal(assignment, domains, 800)
    : assignment;

  // ── Build output entries ─────────────────────────────────────────────────────
  const entries = [];
  for (const [, slot] of finalAssignment) {
    entries.push({
      course_id:      slot.course_id,
      course_code:    slot.course_code,
      course_name:    slot.course_name,
      session_type:   slot.session_type,
      level:          slot.level,
      room_code:      slot.room_code,
      staff_id:       slot.staff_id,
      day:            slot.day,
      period:         slot.period,
      start:          slot.start,
      end:            slot.end,
      subgroup:       slot.subgroup     ?? null,
      groups_covered: slot.groups_covered ?? [],
    });
  }

  return {
    entries,
    infeasible: [],
    stats: {
      totalSessions:    sessions.length,
      assignedSessions: entries.length,
      success,
      restarts,
      backtracks,
      phase: success ? "annealing_complete" : "partial",
    },
  };
}
