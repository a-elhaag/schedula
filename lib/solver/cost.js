// lib/solver/cost.js

const TARGET_MAX_DAYS = 4; // students should attend at most 4 days per week

/**
 * Get the scheduling unit key for a session.
 * Subgroups are the primary unit; lectures use their first group.
 */
function unitKey(slot) {
  return slot.subgroup ?? slot.groups_covered?.[0] ?? "unknown";
}

/**
 * Score a candidate slot — lower = better.
 *
 * Strategy:
 *  1. Strongly prefer days the unit already has sessions on (pack existing days)
 *  2. Among new days, prefer days that other units in the SAME group already use
 *     (so the whole group shares the same campus days)
 *  3. Large bonus for adjacent slots (no gaps)
 *  4. Big penalty for exceeding TARGET_MAX_DAYS
 */
export function scoreCandidate(session, candidate, assignment) {
  const key   = session.subgroup ?? session.groups_covered?.[0] ?? "unknown";
  const group = key.replace(/-\d+$/, ""); // strip subgroup suffix → group id

  let score = 0;

  // Count how many days this unit currently occupies and which days those are
  const unitActiveDays  = new Set();
  const groupActiveDays = new Set();
  let   alreadyOnDay    = false;
  let   adjacentPeriod  = false;

  for (const slot of assignment.values()) {
    const sk = unitKey(slot);
    const sg = sk.replace(/-\d+$/, "");

    if (sk === key) {
      unitActiveDays.add(slot.day);
      if (slot.day === candidate.day) {
        alreadyOnDay = true;
        // Check adjacency (period right before or after)
        if (Math.abs(slot.period - candidate.period) === 1) adjacentPeriod = true;
      }
    }
    if (sg === group) {
      groupActiveDays.add(slot.day);
    }
  }

  // ── Day compaction ──────────────────────────────────────────────────────────
  if (alreadyOnDay) {
    // Best case: same day as existing session
    score -= 30;
    if (adjacentPeriod) score -= 20; // back-to-back bonus
  } else {
    const newDayCount = unitActiveDays.size + 1;

    // Heavy penalty for each day beyond the target
    if (newDayCount > TARGET_MAX_DAYS) {
      score += 100 * (newDayCount - TARGET_MAX_DAYS);
    } else {
      // Moderate penalty for each new campus day
      score += 20 * newDayCount;
    }

    // Softer bonus if this new day is already used by other subgroups in same group
    // (keeps the group's schedule on shared days so students know when to come in)
    if (groupActiveDays.has(candidate.day)) {
      score -= 10;
    }
  }

  return score;
}

/**
 * Compute the total soft constraint cost of a full assignment.
 * Used by SA post-processor — lower = better.
 *
 * Weights:
 *   w1 = 50  — each distinct campus day per unit  (dominant objective)
 *   w2 = 200 — each day beyond TARGET_MAX_DAYS    (hard soft constraint)
 *   w3 = 15  — each idle period gap on a day      (minimize waiting)
 *   w4 = 5   — days spread unevenly across the week (prefer front-loading)
 */
export function computeCost(assignment) {
  const unitDays = {}; // unit → { day → [periods] }

  for (const slot of assignment.values()) {
    const key = unitKey(slot);
    if (!unitDays[key])           unitDays[key] = {};
    if (!unitDays[key][slot.day]) unitDays[key][slot.day] = [];
    unitDays[key][slot.day].push(slot.period);
  }

  let cost = 0;

  for (const days of Object.values(unitDays)) {
    const dayCount = Object.keys(days).length;

    // w1: base cost per campus day
    cost += 50 * dayCount;

    // w2: extra penalty for each day beyond target
    if (dayCount > TARGET_MAX_DAYS) {
      cost += 200 * (dayCount - TARGET_MAX_DAYS);
    }

    // w3: idle gaps on each day
    for (const periods of Object.values(days)) {
      const sorted = [...periods].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1] - 1;
        if (gap > 0) cost += 15 * gap;
      }
    }
  }

  return cost;
}

/**
 * Count how many units exceed TARGET_MAX_DAYS.
 * Used to report schedule quality.
 */
export function countOverTarget(assignment) {
  const unitDays = {};
  for (const slot of assignment.values()) {
    const key = unitKey(slot);
    if (!unitDays[key]) unitDays[key] = new Set();
    unitDays[key].add(slot.day);
  }
  let over = 0;
  for (const days of Object.values(unitDays)) {
    if (days.size > TARGET_MAX_DAYS) over++;
  }
  return over;
}
