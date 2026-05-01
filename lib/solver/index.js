// lib/solver/index.js
import { buildLevelMap } from "./subgroups.js";
import { expandAll }     from "./expand.js";
import { buildTimeGrid, buildDomains } from "./domains.js";
import { solveWithRestarts } from "./backtrack.js";
import { anneal }        from "./anneal.js";
import { getDb }         from "../db.js";

/**
 * Run the full 3-phase solver.
 *
 * Phase 0: expand courses into sessions (descending level order)
 * Phase 1: AC-3 domain trimming with staff availability as hard constraint
 * Phase 2: greedy MCV backtracker with lightweight forward checking
 * Phase 2b: if Phase 2 fails or is partial → relax availability to soft,
 *            retry with all campus days open, then mark relaxed sessions
 * Phase 3: simulated annealing post-processing (800ms budget)
 */
export async function runSolver(institutionId, termLabel) {
  const { ObjectId } = await import("mongodb");
  const db   = await getDb();
  const iOid = new ObjectId(institutionId);

  // ── Load data ────────────────────────────────────────────────────────────────
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

  // ── Build strict availability map (staff → available_days[]) ─────────────────
  const strictAvailMap = new Map();
  for (const a of allAvail) {
    strictAvailMap.set(a.user_id.toString(), a.available_days ?? []);
  }

  // ── Relaxed availability map: all campus days open for everyone ───────────────
  const workingDays = institution.active_term?.working_days ?? [];
  const relaxedAvailMap = new Map();
  for (const a of allAvail) {
    relaxedAvailMap.set(a.user_id.toString(), workingDays);
  }

  // ── Phase 0: expand sessions (descending level order) ────────────────────────
  const levelMap = buildLevelMap(levelsConfig.data.levels);
  const sessions = expandAll(courses, levelMap);

  if (sessions.length === 0) {
    const err = new Error("No sessions to schedule. Check course session types."); err.status = 400; throw err;
  }

  const timeGrid = buildTimeGrid(institution);

  // ── Phase 1: try with strict availability ────────────────────────────────────
  const { domains: strictDomains, infeasible: strictInfeasible } =
    buildDomains(sessions, timeGrid, strictAvailMap, institution);

  // If some sessions have empty domains with strict availability, move straight
  // to relaxed mode rather than reporting infeasible immediately.
  const useRelaxed = strictInfeasible.length > 0;
  const domains    = useRelaxed
    ? buildDomains(sessions, timeGrid, relaxedAvailMap, institution).domains
    : strictDomains;

  // Safety: if even relaxed domains are empty something is fundamentally wrong
  const { infeasible: relaxedInfeasible } = useRelaxed
    ? buildDomains(sessions, timeGrid, relaxedAvailMap, institution)
    : { infeasible: [] };

  if (relaxedInfeasible.length > 0) {
    return {
      entries: [],
      infeasible: relaxedInfeasible,
      stats: { totalSessions: sessions.length, assignedSessions: 0, success: false, restarts: 0, backtracks: 0, phase: "domain_trimming" },
    };
  }

  // ── Phase 2: backtracker ─────────────────────────────────────────────────────
  const { assignment, success, restarts, backtracks } = solveWithRestarts(sessions, domains);

  // ── Phase 2b: if still partial, relax availability and retry ────────────────
  let finalAssignment = assignment;
  let finalSuccess    = success;
  let finalRestarts   = restarts;
  let finalBacktracks = backtracks;
  let availabilityRelaxed = useRelaxed;

  if (!success) {
    // Only retry with relaxed domains if we haven't already
    if (!useRelaxed) {
      const relaxedDomains = buildDomains(sessions, timeGrid, relaxedAvailMap, institution).domains;
      const retry = solveWithRestarts(sessions, relaxedDomains);
      finalAssignment     = retry.assignment.size > assignment.size ? retry.assignment : assignment;
      finalSuccess        = retry.success;
      finalRestarts       = retry.restarts;
      finalBacktracks     = backtracks + retry.backtracks;
      availabilityRelaxed = true;
    } else {
      finalAssignment = assignment;
    }
  }

  // ── Phase 3: SA post-processing ──────────────────────────────────────────────
  const saAssignment = finalSuccess
    ? anneal(finalAssignment, domains, 800)
    : finalAssignment;

  // ── Build output ─────────────────────────────────────────────────────────────
  const entries = [];
  for (const [, slot] of saAssignment) {
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
      subgroup:       slot.subgroup      ?? null,
      groups_covered: slot.groups_covered ?? [],
    });
  }

  return {
    entries,
    infeasible: [],
    availabilityRelaxed,
    strictInfeasibleCount: strictInfeasible.length,
    stats: {
      totalSessions:    sessions.length,
      assignedSessions: entries.length,
      success:          finalSuccess,
      restarts:         finalRestarts,
      backtracks:       finalBacktracks,
      availabilityRelaxed,
      phase: finalSuccess ? "annealing_complete" : "partial",
    },
  };
}
