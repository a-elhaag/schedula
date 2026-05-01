// lib/solver/anneal.js
import { computeCost } from "./cost.js";

/**
 * Check if moving sessionId to newSlot conflicts with the current assignment.
 * Quick HC check — only needs to verify the target slot.
 */
function moveIsValid(sessionId, newSlot, currentAssignment) {
  for (const [otherId, otherSlot] of currentAssignment) {
    if (otherId === sessionId) continue;
    if (otherSlot.day !== newSlot.day || otherSlot.period !== newSlot.period) continue;

    // HC-1: room conflict
    if (otherSlot.room_code === newSlot.room_code) return false;

    // HC-2: staff conflict
    const sessionStaff = currentAssignment.get(sessionId)?.staff_id;
    if (sessionStaff && otherSlot.staff_id &&
        sessionStaff.toString() === otherSlot.staff_id.toString()) return false;

    // HC-4: subgroup conflict
    const sessionSubgroup = currentAssignment.get(sessionId)?.subgroup;
    if (sessionSubgroup && otherSlot.subgroup && sessionSubgroup === otherSlot.subgroup) return false;

    // HC-3/4: lecture/subgroup cross-conflict
    const sessionGroups = currentAssignment.get(sessionId)?.groups_covered ?? [];
    if (sessionSubgroup && otherSlot.session_type === "lecture") {
      const g = sessionSubgroup.replace(/-\d+$/, "");
      if (otherSlot.groups_covered?.includes(g)) return false;
    }
    if (!sessionSubgroup && currentAssignment.get(sessionId)?.session_type === "lecture" && otherSlot.subgroup) {
      const g = otherSlot.subgroup.replace(/-\d+$/, "");
      if (sessionGroups.includes(g)) return false;
    }
  }
  return true;
}

/**
 * Simulated annealing post-processor.
 *
 * Two move types each iteration:
 *   A) RELOCATE: move one session to a different slot on a day the unit already uses
 *      (or any slot — but strongly biased toward already-used days)
 *   B) SWAP: exchange two sessions of the same type
 *
 * Heavily weighted toward day compaction (TARGET_MAX_DAYS = 4).
 *
 * @param {Map} assignment  - sessionId → slot (from greedy solver)
 * @param {Map} domains     - sessionId → valid slots[]
 * @param {number} budgetMs - time budget in ms
 * @returns {Map} improved assignment
 */
export function anneal(assignment, domains, budgetMs = 1500) {
  const start     = Date.now();
  let current     = new Map(assignment);
  let currentCost = computeCost(current);
  let best        = new Map(current);
  let bestCost    = currentCost;

  let temperature  = 2.0;
  const coolingRate = 0.998; // slower cooling → more exploration

  const sessionIds = [...assignment.keys()];
  let   iterations  = 0;

  while (Date.now() - start < budgetMs) {
    iterations++;
    const useSwap = Math.random() < 0.4; // 40% swaps, 60% relocations

    if (useSwap) {
      // ── Move B: swap two sessions of same type ───────────────────────────────
      const idxA = Math.floor(Math.random() * sessionIds.length);
      const idxB = Math.floor(Math.random() * sessionIds.length);
      if (idxA === idxB) continue;

      const idA   = sessionIds[idxA];
      const idB   = sessionIds[idxB];
      const slotA = current.get(idA);
      const slotB = current.get(idB);
      if (!slotA || !slotB) continue;
      if (slotA.session_type !== slotB.session_type) continue;

      // Check domain membership for the swap
      const domainA = domains.get(idA) ?? [];
      const domainB = domains.get(idB) ?? [];
      const aCanTakeB = domainA.some(s => s.day === slotB.day && s.period === slotB.period && s.room_code === slotB.room_code);
      const bCanTakeA = domainB.some(s => s.day === slotA.day && s.period === slotA.period && s.room_code === slotA.room_code);
      if (!aCanTakeB || !bCanTakeA) continue;

      const newAssignment = new Map(current);
      newAssignment.set(idA, { ...slotA, day: slotB.day, period: slotB.period, room_code: slotB.room_code, start: slotB.start, end: slotB.end });
      newAssignment.set(idB, { ...slotB, day: slotA.day, period: slotA.period, room_code: slotA.room_code, start: slotA.start, end: slotA.end });

      const newCost = computeCost(newAssignment);
      const delta   = newCost - currentCost;
      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        current     = newAssignment;
        currentCost = newCost;
        if (currentCost < bestCost) { best = new Map(current); bestCost = currentCost; }
      }

    } else {
      // ── Move A: relocate one session to a better slot ────────────────────────
      const idx     = Math.floor(Math.random() * sessionIds.length);
      const id      = sessionIds[idx];
      const curSlot = current.get(id);
      if (!curSlot) continue;

      const domain  = domains.get(id) ?? [];
      if (domain.length <= 1) continue;

      // Find what days this unit currently occupies
      const unitActiveDays = new Set();
      for (const slot of current.values()) {
        const k = slot.subgroup ?? slot.groups_covered?.[0];
        const ck = curSlot.subgroup ?? curSlot.groups_covered?.[0];
        if (k === ck) unitActiveDays.add(slot.day);
      }

      // Strongly prefer slots on days already occupied by this unit
      const preferredSlots = domain.filter(s =>
        unitActiveDays.has(s.day) &&
        !(s.day === curSlot.day && s.period === curSlot.period && s.room_code === curSlot.room_code)
      );
      const candidatePool = preferredSlots.length > 0
        ? preferredSlots
        : domain.filter(s => !(s.day === curSlot.day && s.period === curSlot.period && s.room_code === curSlot.room_code));

      if (candidatePool.length === 0) continue;

      const newSlot = candidatePool[Math.floor(Math.random() * candidatePool.length)];

      // Quick HC check for the new position
      if (!moveIsValid(id, newSlot, current)) continue;

      const newAssignment = new Map(current);
      newAssignment.set(id, { ...curSlot, day: newSlot.day, period: newSlot.period, room_code: newSlot.room_code, start: newSlot.start, end: newSlot.end });

      const newCost = computeCost(newAssignment);
      const delta   = newCost - currentCost;
      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        current     = newAssignment;
        currentCost = newCost;
        if (currentCost < bestCost) { best = new Map(current); bestCost = currentCost; }
      }
    }

    temperature *= coolingRate;
  }

  return best;
}
