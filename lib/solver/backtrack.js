// lib/solver/backtrack.js
import { scoreCandidate } from "./cost.js";

/**
 * Check hard constraints for placing `session` in `candidate` slot,
 * given existing `assignment`.
 * Returns true if valid (no conflicts).
 */
function isValid(session, candidate, assignment, sessions) {
  for (const [assignedId, slot] of assignment) {
    if (slot.day !== candidate.day || slot.period !== candidate.period) continue;

    // HC-1: room must not be double-booked
    if (slot.room_code === candidate.room_code) return false;

    const other = sessions.find(s => s.id === assignedId);
    if (!other) continue;

    // HC-2: instructor must not teach two sessions at the same time
    if (
      session.staff_id && other.staff_id &&
      session.staff_id.toString() === other.staff_id.toString()
    ) return false;

    // HC-3: two lectures for the same group cannot overlap
    if (session.session_type === "lecture" && other.session_type === "lecture") {
      const overlap = session.groups_covered.some(g => other.groups_covered.includes(g));
      if (overlap) return false;
    }

    // HC-4a: two sessions for the same subgroup cannot overlap
    if (session.subgroup && other.subgroup && session.subgroup === other.subgroup) return false;

    // HC-4b: subgroup session cannot overlap with a lecture that covers its group
    if (session.subgroup && other.session_type === "lecture") {
      const groupOfSubgroup = session.subgroup.replace(/-\d+$/, "");
      if (other.groups_covered.includes(groupOfSubgroup)) return false;
    }
    if (other.subgroup && session.session_type === "lecture") {
      const groupOfOther = other.subgroup.replace(/-\d+$/, "");
      if (session.groups_covered.includes(groupOfOther)) return false;
    }
  }
  return true;
}

/**
 * Forward check: after tentatively assigning `session` to `candidate`,
 * verify that every remaining unassigned session still has at least one valid slot.
 */
function forwardCheck(remaining, domains, assignment, sessions) {
  for (const session of remaining) {
    const domain = domains.get(session.id) ?? [];
    const hasValid = domain.some(slot => isValid(session, slot, assignment, sessions));
    if (!hasValid) return false;
  }
  return true;
}

/**
 * Sort sessions by domain size ascending (Most Constrained Variable heuristic).
 * Ties broken by: lectures first (largest conflict footprint), then tutorials, then labs.
 */
function sortByMCV(sessions, domains) {
  const typeOrder = { lecture: 0, tutorial: 1, lab: 2 };
  return [...sessions].sort((a, b) => {
    const da = domains.get(a.id)?.length ?? 0;
    const db = domains.get(b.id)?.length ?? 0;
    if (da !== db) return da - db;
    return (typeOrder[a.session_type] ?? 3) - (typeOrder[b.session_type] ?? 3);
  });
}

/**
 * Run the backtracking solver.
 *
 * @param {object[]} sessions
 * @param {Map} domains - sessionId → slot[]
 * @param {number} maxBacktracks
 * @returns {{ assignment: Map, backtracks: number, success: boolean }}
 */
export function backtrack(sessions, domains, maxBacktracks = 2000) {
  const assignment = new Map();
  let backtracks   = 0;

  const sorted = sortByMCV(sessions, domains);

  function assign(idx) {
    if (idx === sorted.length) return true;
    if (backtracks > maxBacktracks) return false;

    const session = sorted[idx];
    const domain  = domains.get(session.id) ?? [];

    // Filter to HC-valid slots, then score for soft constraint preference
    const valid = domain.filter(slot => isValid(session, slot, assignment, sessions));
    const scored = valid
      .map(slot => ({ slot, score: scoreCandidate(session, slot, assignment) }))
      .sort((a, b) => a.score - b.score);

    for (const { slot } of scored) {
      assignment.set(session.id, {
        ...slot,
        subgroup:       session.subgroup,
        groups_covered: session.groups_covered,
        session_type:   session.session_type,
        course_id:      session.course_id,
        course_code:    session.course_code,
        course_name:    session.course_name,
        level:          session.level,
        staff_id:       session.staff_id,
        duration:       session.duration,
      });

      const remaining = sorted.slice(idx + 1);
      if (forwardCheck(remaining, domains, assignment, sessions)) {
        if (assign(idx + 1)) return true;
      }

      assignment.delete(session.id);
      backtracks++;
    }

    return false;
  }

  const success = assign(0);
  return { assignment, backtracks, success };
}

/**
 * Run the backtracker with multiple restarts on failure.
 * Returns the best result (most sessions assigned) across all restarts.
 */
export function solveWithRestarts(sessions, domains, maxRestarts = 5, maxBacktracks = 2000) {
  let best = null;

  for (let r = 0; r < maxRestarts; r++) {
    // First run uses MCV order; subsequent runs shuffle for diversity
    const ordered = r === 0
      ? sessions
      : [...sessions].sort(() => Math.random() - 0.5);

    const result = backtrack(ordered, domains, maxBacktracks);
    if (result.success) return { ...result, restarts: r };

    if (!best || result.assignment.size > best.assignment.size) {
      best = { ...result, restarts: r };
    }
  }

  return { ...best, success: false };
}
