// lib/solver/domains.js
import { LECTURE_HALLS, TUTORIAL_ROOMS, LAB_ROOMS } from "../rooms.js";

/**
 * Build the full time grid from institution settings.
 * Returns: [{ period, day, start, end }] for every valid (day, period) pair.
 */
export function buildTimeGrid(institution) {
  const workingDays    = institution.active_term?.working_days ?? ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
  const numPeriods     = institution.settings?.num_periods     ?? 10;
  const [startH, startM] = (institution.settings?.daily_start ?? "08:30").split(":").map(Number);
  const periodDuration = institution.settings?.slot_duration_minutes ?? 60;

  const slots = [];
  for (const day of workingDays) {
    for (let p = 1; p <= numPeriods; p++) {
      const startMinsTotal = startH * 60 + startM + (p - 1) * periodDuration;
      const endMinsTotal   = startMinsTotal + periodDuration;

      const sH = Math.floor(startMinsTotal / 60);
      const sM = startMinsTotal % 60;
      const eH = Math.floor(endMinsTotal / 60);
      const eM = endMinsTotal % 60;

      slots.push({
        period: p,
        day,
        start: `${String(sH).padStart(2,"0")}:${String(sM).padStart(2,"0")}`,
        end:   `${String(eH).padStart(2,"0")}:${String(eM).padStart(2,"0")}`,
      });
    }
  }
  return slots;
}

/**
 * Return the room list for a given session type (HC-6).
 */
function roomsForType(sessionType) {
  if (sessionType === "lecture")  return LECTURE_HALLS;
  if (sessionType === "tutorial") return TUTORIAL_ROOMS;
  return LAB_ROOMS; // lab
}

/**
 * Compute the domain for a single session.
 * Domain = [{ day, period, start, end, room_code }]
 *
 * Removes slots where:
 *   - Instructor is not available on that day (HC-10)
 *   - Session duration needs more periods than the time grid has remaining (HC-8)
 */
export function computeDomain(session, timeGrid, availabilityMap, institution) {
  const availDays     = availabilityMap.get(session.staff_id?.toString()) ?? null;
  const periodDurMins = institution.settings?.slot_duration_minutes ?? 60;
  const numPeriods    = institution.settings?.num_periods            ?? 10;
  const periodsNeeded = Math.ceil(session.duration / periodDurMins);

  const rooms  = roomsForType(session.session_type);
  const domain = [];

  for (const slot of timeGrid) {
    // HC-10: if staff has availability data and this day is not available, skip
    if (availDays !== null && !availDays.includes(slot.day)) continue;

    // HC-8: session must not extend past the last period
    if (slot.period + periodsNeeded - 1 > numPeriods) continue;

    for (const room of rooms) {
      domain.push({
        day:       slot.day,
        period:    slot.period,
        start:     slot.start,
        end:       slot.end,
        room_code: room.code,
      });
    }
  }

  return domain;
}

/**
 * Build domains for all sessions.
 * Returns { domains: Map<sessionId, slot[]>, infeasible: object[] }
 *
 * Sessions with empty domains are collected in infeasible[] (not thrown).
 */
export function buildDomains(sessions, timeGrid, availabilityMap, institution) {
  const domains    = new Map();
  const infeasible = [];

  for (const session of sessions) {
    const domain = computeDomain(session, timeGrid, availabilityMap, institution);
    domains.set(session.id, domain);

    if (domain.length === 0) {
      infeasible.push({
        session_id:   session.id,
        course_code:  session.course_code,
        session_type: session.session_type,
        subgroup:     session.subgroup,
        reason:       "No valid (day, period, room) slot after domain trimming",
      });
    }
  }

  return { domains, infeasible };
}
