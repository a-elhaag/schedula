// lib/solver/backtrack.js
import { scoreCandidate, computeCost } from "./cost.js";

// ── HC violation checkers ────────────────────────────────────────────────────

function roomConflict(slotA, slotB) {
  return slotA.room_code === slotB.room_code;
}

function staffConflict(sessionA, sessionB) {
  return (
    sessionA.staff_id &&
    sessionB.staff_id &&
    sessionA.staff_id.toString() === sessionB.staff_id.toString()
  );
}

function groupConflict(sessionA, sessionB) {
  // Two lectures covering the same group
  if (sessionA.session_type === "lecture" && sessionB.session_type === "lecture") {
    return sessionA.groups_covered.some(g => sessionB.groups_covered.includes(g));
  }
  // Subgroup same as subgroup
  if (sessionA.subgroup && sessionB.subgroup && sessionA.subgroup === sessionB.subgroup) {
    return true;
  }
  // Subgroup attends a lecture covering its group
  if (sessionA.subgroup && sessionB.session_type === "lecture") {
    const g = sessionA.subgroup.replace(/-\d+$/, "");
    return sessionB.groups_covered.includes(g);
  }
  if (sessionB.subgroup && sessionA.session_type === "lecture") {
    const g = sessionB.subgroup.replace(/-\d+$/, "");
    return sessionA.groups_covered.includes(g);
  }
  return false;
}

/**
 * Check if placing sessionA in slotA conflicts with any existing assignment.
 * Uses a pre-built slot index for O(1) day+period lookup.
 *
 * slotIndex: Map<"day|period", Array<{ session, slot }>>
 */
function hasConflict(session, candidate, slotIndex, sessionById) {
  const key = `${candidate.day}|${candidate.period}`;
  const occupied = slotIndex.get(key) ?? [];

  for (const { session: other, slot: otherSlot } of occupied) {
    if (roomConflict(candidate, otherSlot))       return true;
    if (staffConflict(session, other))             return true;
    if (groupConflict(session, other))             return true;
  }
  return false;
}

// ── Greedy assignment ────────────────────────────────────────────────────────

/**
 * Phase 1 — Greedy: assign every session to its best conflict-free slot.
 * Never backtracks. Sessions that can't be placed are left unassigned.
 * globalSlotIndex: pre-populated with entries from previously solved levels.
 * Returns { assignment: Map, unassigned: session[] }
 */
function greedyAssign(sessions, domains, globalSlotIndex = new Map()) {
  // Sort: most constrained (smallest domain) first, lectures before tut/lab
  const typeOrder = { lecture: 0, tutorial: 1, lab: 2 };
  const sorted = [...sessions].sort((a, b) => {
    const da = domains.get(a.id)?.length ?? 0;
    const db = domains.get(b.id)?.length ?? 0;
    if (da !== db) return da - db;
    return (typeOrder[a.session_type] ?? 3) - (typeOrder[b.session_type] ?? 3);
  });

  const assignment = new Map();
  // slotIndex: "day|period" → [{ session, slot }]
  // Pre-seed with global entries from previously scheduled levels
  const slotIndex  = new Map();
  for (const [key, entries] of globalSlotIndex) {
    slotIndex.set(key, [...entries]);
  }

  const sessionById = new Map(sessions.map(s => [s.id, s]));

  function addToIndex(session, slot) {
    const key = `${slot.day}|${slot.period}`;
    if (!slotIndex.has(key)) slotIndex.set(key, []);
    slotIndex.get(key).push({ session, slot });
  }

  const unassigned = [];

  for (const session of sorted) {
    const domain = domains.get(session.id) ?? [];

    // Score valid candidates: prefer days the session's group already occupies
    const valid = domain.filter(slot => !hasConflict(session, slot, slotIndex, sessionById));

    if (valid.length === 0) {
      unassigned.push(session);
      continue;
    }

    // Pick best slot (lowest soft cost)
    const best = valid.reduce((bestSoFar, slot) => {
      const score = scoreCandidate(session, slot, assignment);
      return score < bestSoFar.score ? { slot, score } : bestSoFar;
    }, { slot: valid[0], score: Infinity });

    const chosen = best.slot;
    const entry = {
      ...chosen,
      subgroup:       session.subgroup,
      groups_covered: session.groups_covered,
      session_type:   session.session_type,
      course_id:      session.course_id,
      course_code:    session.course_code,
      course_name:    session.course_name,
      level:          session.level,
      staff_id:       session.staff_id,
      duration:       session.duration,
    };
    assignment.set(session.id, entry);
    addToIndex(session, chosen);
  }

  return { assignment, unassigned };
}

// ── Conflict repair ──────────────────────────────────────────────────────────

/**
 * Phase 2 — Repair: for each unassigned session, try to swap it with an
 * already-assigned session to free up a valid slot.
 * Gives up on individual sessions after MAX_SWAP_ATTEMPTS swaps.
 */
function repairUnassigned(unassigned, assignment, domains, sessions, maxAttempts = 50) {
  if (unassigned.length === 0) return assignment;

  const sessionById = new Map(sessions.map(s => [s.id, s]));

  // Rebuild slot index from current assignment
  const slotIndex = new Map();
  for (const [sid, slot] of assignment) {
    const session = sessionById.get(sid);
    if (!session) continue;
    const key = `${slot.day}|${slot.period}`;
    if (!slotIndex.has(key)) slotIndex.set(key, []);
    slotIndex.get(key).push({ session, slot });
  }

  function removeFromIndex(session, slot) {
    const key = `${slot.day}|${slot.period}`;
    const arr = slotIndex.get(key) ?? [];
    slotIndex.set(key, arr.filter(e => e.session.id !== session.id));
  }

  function addToIndex(session, slot) {
    const key = `${slot.day}|${slot.period}`;
    if (!slotIndex.has(key)) slotIndex.set(key, []);
    slotIndex.get(key).push({ session, slot });
  }

  const stillUnassigned = [];

  for (const session of unassigned) {
    const domain = domains.get(session.id) ?? [];
    let placed = false;

    // First try direct placement (maybe a slot freed up during repairs)
    const directValid = domain.filter(slot => !hasConflict(session, slot, slotIndex, sessionById));
    if (directValid.length > 0) {
      const best = directValid.reduce((b, slot) => {
        const s = scoreCandidate(session, slot, assignment);
        return s < b.score ? { slot, score: s } : b;
      }, { slot: directValid[0], score: Infinity });

      const entry = {
        ...best.slot,
        subgroup: session.subgroup, groups_covered: session.groups_covered,
        session_type: session.session_type, course_id: session.course_id,
        course_code: session.course_code, course_name: session.course_name,
        level: session.level, staff_id: session.staff_id, duration: session.duration,
      };
      assignment.set(session.id, entry);
      addToIndex(session, best.slot);
      placed = true;
    }

    if (placed) continue;

    // Try swap: for each domain slot, find blocking sessions and try to relocate one
    let attempts = 0;
    for (const candidate of domain) {
      if (attempts >= maxAttempts) break;
      attempts++;

      const key = `${candidate.day}|${candidate.period}`;
      const blockers = (slotIndex.get(key) ?? []).filter(({ session: other, slot: otherSlot }) =>
        roomConflict(candidate, otherSlot) ||
        staffConflict(session, other) ||
        groupConflict(session, other)
      );

      if (blockers.length === 0) continue;

      // Try to relocate the first blocker to one of its own domain slots
      const { session: blocker, slot: blockerSlot } = blockers[0];
      const blockerDomain = domains.get(blocker.id) ?? [];

      // Temporarily remove blocker from index
      removeFromIndex(blocker, blockerSlot);
      assignment.delete(blocker.id);

      // Find a new slot for blocker that doesn't conflict with anything remaining
      const blockerAlternatives = blockerDomain.filter(s =>
        !(s.day === blockerSlot.day && s.period === blockerSlot.period && s.room_code === blockerSlot.room_code) &&
        !hasConflict(blocker, s, slotIndex, sessionById)
      );

      if (blockerAlternatives.length > 0 && !hasConflict(session, candidate, slotIndex, sessionById)) {
        // Relocate blocker
        const newBlockerSlot = blockerAlternatives[0];
        const blockerEntry = {
          ...newBlockerSlot,
          subgroup: blocker.subgroup, groups_covered: blocker.groups_covered,
          session_type: blocker.session_type, course_id: blocker.course_id,
          course_code: blocker.course_code, course_name: blocker.course_name,
          level: blocker.level, staff_id: blocker.staff_id, duration: blocker.duration,
        };
        assignment.set(blocker.id, blockerEntry);
        addToIndex(blocker, newBlockerSlot);

        // Place the unassigned session
        const entry = {
          ...candidate,
          subgroup: session.subgroup, groups_covered: session.groups_covered,
          session_type: session.session_type, course_id: session.course_id,
          course_code: session.course_code, course_name: session.course_name,
          level: session.level, staff_id: session.staff_id, duration: session.duration,
        };
        assignment.set(session.id, entry);
        addToIndex(session, candidate);
        placed = true;
        break;
      } else {
        // Restore blocker
        const restoredEntry = {
          ...blockerSlot,
          subgroup: blocker.subgroup, groups_covered: blocker.groups_covered,
          session_type: blocker.session_type, course_id: blocker.course_id,
          course_code: blocker.course_code, course_name: blocker.course_name,
          level: blocker.level, staff_id: blocker.staff_id, duration: blocker.duration,
        };
        assignment.set(blocker.id, restoredEntry);
        addToIndex(blocker, blockerSlot);
      }
    }

    if (!placed) {
      stillUnassigned.push(session);
    }
  }

  return assignment;
}

// ── SA post-processing imported separately in index.js ───────────────────────

/**
 * Main solver entry point.
 * Phase 1: greedy assignment (most constrained first)
 * Phase 2: conflict repair (swap unassigned sessions into freed slots)
 * Returns { assignment: Map, backtracks: number, success: boolean }
 */
export function solveWithRestarts(sessions, domains, maxRestarts = 3, globalSlotIndex = new Map()) {
  let bestAssignment = new Map();

  for (let r = 0; r < maxRestarts; r++) {
    const ordered = r === 0
      ? sessions
      : [...sessions].sort(() => Math.random() - 0.5);

    const { assignment, unassigned } = greedyAssign(ordered, domains, globalSlotIndex);
    const repaired = repairUnassigned(unassigned, assignment, domains, sessions, 100);

    if (repaired.size > bestAssignment.size) {
      bestAssignment = repaired;
    }

    if (bestAssignment.size === sessions.length) break;
  }

  return {
    assignment: bestAssignment,
    backtracks: 0,
    success:    bestAssignment.size === sessions.length,
    restarts:   0,
  };
}

// Keep backtrack export for compatibility
export { solveWithRestarts as backtrack };
