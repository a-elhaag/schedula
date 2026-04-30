"use client";

import "./ScheduleTable.css";

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Generate list of time slots (e.g., 09:00, 09:30, 10:00, etc.)
 */
function generateTimeSlots(sessions) {
  const times = new Set();
  sessions.forEach(s => {
    times.add(s.start);
    times.add(s.end);
  });

  if (times.size === 0) return [];

  const sorted = Array.from(times)
    .map(t => ({ time: t, minutes: timeToMinutes(t) }))
    .sort((a, b) => a.minutes - b.minutes);

  return sorted.map(t => t.time);
}

/**
 * Check if session falls within a time slot
 */
function isSessionInSlot(session, slotTime, nextSlotTime) {
  const sessionStart = timeToMinutes(session.start);
  const slotStart = timeToMinutes(slotTime);
  const slotEnd = nextSlotTime ? timeToMinutes(nextSlotTime) : slotStart + 60;

  return sessionStart >= slotStart && sessionStart < slotEnd;
}

/**
 * Get all sessions for a day + time slot
 */
function getSessionsAtSlot(sessions, day, slotTime, nextSlotTime) {
  return (sessions[day] || []).filter(s => isSessionInSlot(s, slotTime, nextSlotTime));
}

export default function ScheduleTable({ sessions = {}, days = [] }) {
  if (!days.length) return <div className="schedule-table-empty">No schedule data</div>;

  // Flatten all sessions to generate time slots
  const allSessions = Object.values(sessions).flat();
  const timeSlots = generateTimeSlots(allSessions);

  if (!timeSlots.length) {
    return <div className="schedule-table-empty">No sessions scheduled</div>;
  }

  return (
    <div className="schedule-table-wrapper">
      <table className="schedule-table">
        <thead>
          <tr>
            <th className="schedule-table__time-header">Time</th>
            {days.map(day => (
              <th key={day} className="schedule-table__day-header">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time, idx) => {
            const nextTime = timeSlots[idx + 1];
            return (
              <tr key={time} className="schedule-table__row">
                <td className="schedule-table__time-cell">{time}</td>
                {days.map(day => {
                  const daySessionsAtSlot = getSessionsAtSlot(sessions, day, time, nextTime);

                  return (
                    <td key={`${day}-${time}`} className="schedule-table__cell">
                      {daySessionsAtSlot.length > 0 ? (
                        <div className="schedule-table__sessions">
                          {daySessionsAtSlot.map(session => (
                            <div key={session.id} className={`schedule-table__session schedule-table__session--${session.type?.toLowerCase() || 'lecture'}`}>
                              <div className="schedule-table__session-time">
                                {session.start} – {session.end}
                              </div>
                              <div className="schedule-table__session-code">
                                {session.code}
                              </div>
                              <div className="schedule-table__session-title">
                                {session.title}
                              </div>
                              <div className="schedule-table__session-meta">
                                {session.instructor && <span>{session.instructor}</span>}
                                {session.room && <span>{session.room}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
