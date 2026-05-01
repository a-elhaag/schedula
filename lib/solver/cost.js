// lib/solver/cost.js

/**
 * Score a candidate slot for a session given the current assignment.
 * Lower score = prefer to assign this slot first.
 *
 * Primary goal: pack sessions onto fewer days per subgroup/group.
 * Secondary: minimize gaps on days already occupied.
 */
export function scoreCandidate(session, candidate, assignment) {
  let score = 0;

  // Determine the scheduling unit key (subgroup for tut/lab, first group for lecture)
  const key = session.subgroup ?? session.groups_covered?.[0] ?? "unknown";

  // Penalty for adding a NEW campus day for this unit
  let alreadyOnDay = false;
  for (const slot of assignment.values()) {
    const slotKey = slot.subgroup ?? slot.groups_covered?.[0];
    if (slotKey === key && slot.day === candidate.day) {
      alreadyOnDay = true;
      break;
    }
  }
  if (!alreadyOnDay) score += 10;

  return score;
}

/**
 * Compute the total soft constraint cost of the full assignment.
 * Used by the SA post-processor.
 *
 * cost = w1 × (distinct days each unit attends) + w2 × (idle gap periods per unit per day)
 */
export function computeCost(assignment) {
  // Build: unitDays[unit][day] = sorted periods[]
  const unitDays = {};

  for (const slot of assignment.values()) {
    const key = slot.subgroup ?? slot.groups_covered?.[0] ?? "unknown";
    if (!unitDays[key])            unitDays[key] = {};
    if (!unitDays[key][slot.day])  unitDays[key][slot.day] = [];
    unitDays[key][slot.day].push(slot.period);
  }

  let cost = 0;

  for (const days of Object.values(unitDays)) {
    // w1 = 4: each distinct day costs 4
    cost += 4 * Object.keys(days).length;

    // w2 = 3: each idle period gap between sessions on same day costs 3
    for (const periods of Object.values(days)) {
      const sorted = [...periods].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1] - 1;
        if (gap > 0) cost += 3 * gap;
      }
    }
  }

  return cost;
}
