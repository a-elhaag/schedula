// lib/solver/anneal.js
import { computeCost } from "./cost.js";

/**
 * Simulated annealing post-processor.
 * Improves soft constraint score (minimize campus days + idle gaps)
 * while keeping all hard constraints satisfied.
 *
 * Only swaps between sessions of the SAME type (lecture↔lecture, tut↔tut, lab↔lab)
 * to keep room-type constraints trivially satisfied.
 *
 * @param {Map} assignment - from backtracker (sessionId → slot)
 * @param {Map} domains    - sessionId → valid slots[]
 * @param {number} budgetMs - time budget in milliseconds
 * @returns {Map} improved assignment (or original if no improvement found)
 */
export function anneal(assignment, domains, budgetMs = 800) {
  const start       = Date.now();
  let current       = new Map(assignment);
  let currentCost   = computeCost(current);
  let best          = new Map(current);
  let bestCost      = currentCost;
  let temperature   = 1.0;
  const coolingRate = 0.995;

  const sessionIds = [...assignment.keys()];

  while (Date.now() - start < budgetMs) {
    // Pick two random sessions
    const idxA = Math.floor(Math.random() * sessionIds.length);
    const idxB = Math.floor(Math.random() * sessionIds.length);
    if (idxA === idxB) continue;

    const idA   = sessionIds[idxA];
    const idB   = sessionIds[idxB];
    const slotA = current.get(idA);
    const slotB = current.get(idB);

    if (!slotA || !slotB) continue;

    // Only swap sessions of the same type (preserves HC-6 room type match)
    if (slotA.session_type !== slotB.session_type) continue;

    // Verify each session's new slot exists in its domain
    const domainA = domains.get(idA) ?? [];
    const domainB = domains.get(idB) ?? [];

    const aCanTakeB = domainA.some(
      s => s.day === slotB.day && s.period === slotB.period && s.room_code === slotB.room_code
    );
    const bCanTakeA = domainB.some(
      s => s.day === slotA.day && s.period === slotA.period && s.room_code === slotA.room_code
    );

    if (!aCanTakeB || !bCanTakeA) continue;

    // Tentative swap
    const newAssignment = new Map(current);
    newAssignment.set(idA, {
      ...slotA,
      day:       slotB.day,
      period:    slotB.period,
      room_code: slotB.room_code,
      start:     slotB.start,
      end:       slotB.end,
    });
    newAssignment.set(idB, {
      ...slotB,
      day:       slotA.day,
      period:    slotA.period,
      room_code: slotA.room_code,
      start:     slotA.start,
      end:       slotA.end,
    });

    const newCost = computeCost(newAssignment);
    const delta   = newCost - currentCost;

    // Accept improvement always; accept regression with Boltzmann probability
    if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
      current     = newAssignment;
      currentCost = newCost;

      if (currentCost < bestCost) {
        best     = new Map(current);
        bestCost = currentCost;
      }
    }

    temperature *= coolingRate;
  }

  return best;
}
