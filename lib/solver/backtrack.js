// lib/solver/backtrack.js
import { scoreCandidate } from "./cost.js";

/**
 * Check hard constraints for placing `session` in `candidate` slot.
 * Returns true if valid (no HC violation).
 */
function isValid(session, candidate, assignment, sessions) {
  for (const [assignedId, slot] of assignment) {
    if (slot.day !== candidate.day || slot.period !== candidate.period) continue;

    // HC-1: room must not be double-booked
    if (slot.room_code === candidate.room_code) return false;

    const other = sessions.find(s => s.id === assignedId);
    if (!other) continue;

    // HC-2: instructor conflict
    if (
      session.staff_id && other.staff_id &&
      session.staff_id.toString() === other.staff_id.toString()
    ) return false;

    // HC-3: two lectures for the same group
    if (session.session_type === "lecture" && other.session_type === "lecture") {
      const overlap = session.groups_covered.some(g => other.groups_covered.includes(g));
      if (overlap) return false;
    }

    // HC-4a: same subgroup
    if (session.subgroup && other.subgroup && session.subgroup === other.subgroup) return false;

    // HC-4b: subgroup vs lecture that covers its group
    if (session.subgroup && other.session_type === "lecture") {
      const groupId = session.subgroup.replace(/-\d+$/, "");
      if (other.groups_covered.includes(groupId)) return false;
    }
    if (other.subgroup && session.session_type === "lecture") {
      const groupId = other.subgroup.replace(/-\d+$/, "");
      if (session.groups_covered.includes(groupId)) return false;
    }
  }
  return true;
}

/**
 * Lightweight forward check — only verify sessions that share a resource
 * with the just-assigned session (same staff, same subgroup, same groups).
 * Full forward check over all 386 sessions is too expensive and causes
 * immediate failure even when solutions exist.
 */
function forwardCheck(justAssigned, candidate, remaining, domains, assignment, sessions) {
  const affectedIds = new Set();

  for (const s of remaining) {
    // Same staff member
    if (justAssigned.staff_id && s.staff_id &&
        justAssigned.staff_id.toString() === s.staff_id.toString()) {
      affectedIds.add(s.id);
    }
    // Same subgroup
    if (justAssigned.subgroup && s.subgroup &&
        justAssigned.subgroup === s.subgroup) {
      affectedIds.add(s.id);
    }
    // Subgroup in lecture's groups
    if (justAssigned.session_type === "lecture" && s.subgroup) {
      const g = s.subgroup.replace(/-\d+$/, "");
      if (justAssigned.groups_covered.includes(g)) affectedIds.add(s.id);
    }
    if (s.session_type === "lecture" && justAssigned.subgroup) {
      const g = justAssigned.subgroup.replace(/-\d+$/, "");
      if (s.groups_covered.includes(g)) affectedIds.add(s.id);
    }
    // Shared lecture group
    if (justAssigned.session_type === "lecture" && s.session_type === "lecture") {
      const overlap = justAssigned.groups_covered.some(g => s.groups_covered.includes(g));
      if (overlap) affectedIds.add(s.id);
    }
  }

  for (const id of affectedIds) {
    const session = remaining.find(s => s.id === id);
    if (!session) continue;
    const domain = domains.get(id) ?? [];
    const hasValid = domain.some(slot => isValid(session, slot, assignment, sessions));
    if (!hasValid) return false;
  }

  return true;
}

/**
 * Sort sessions by domain size ascending (MCV — most constrained first).
 * Lectures before tutorials before labs on ties.
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

export function backtrack(sessions, domains, maxBacktracks = 5000) {
  const assignment = new Map();
  let backtracks   = 0;

  const sorted = sortByMCV(sessions, domains);

  function assign(idx) {
    if (idx === sorted.length) return true;
    if (backtracks > maxBacktracks) return false;

    const session = sorted[idx];
    const domain  = domains.get(session.id) ?? [];

    const valid = domain.filter(slot => isValid(session, slot, assignment, sessions));
    const scored = valid
      .map(slot => ({ slot, score: scoreCandidate(session, slot, assignment) }))
      .sort((a, b) => a.score - b.score);

    const remaining = sorted.slice(idx + 1);

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

      if (forwardCheck(session, slot, remaining, domains, assignment, sessions)) {
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

export function solveWithRestarts(sessions, domains, maxRestarts = 5, maxBacktracks = 5000) {
  let best = null;

  for (let r = 0; r < maxRestarts; r++) {
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
