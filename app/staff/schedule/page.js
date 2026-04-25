"use client";

import "./styles.css";
import { useEffect, useState } from "react";

const TYPE_CLASS_MAP = {
  Lecture: "type-lecture",
  Tutorial: "type-tutorial",
  Lab: "type-lab",
};

export default function ProfessorSchedulePage() {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/staff/schedule");
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch schedule");
        }
        
        const data = await response.json();
        
        // Transform API response into day blocks format
        const dayOrder = { 
          Saturday: 0, 
          Sunday: 1, 
          Monday: 2, 
          Tuesday: 3, 
          Wednesday: 4, 
          Thursday: 5,
          Friday: 6,
        };
        
        const dayBlocks = Object.entries(data.sessions || {})
          .map(([day, sessions]) => ({
            day,
            sessions: sessions || [],
          }))
          .sort((a, b) => dayOrder[a.day] - dayOrder[b.day]);
        
        setScheduleData({
          dayBlocks,
          isPublished: data.isPublished,
          termLabel: data.termLabel,
          stats: data.stats,
        });
      } catch (err) {
        console.error("Failed to fetch schedule:", err);
        setError(err.message || "Failed to load your schedule. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <main className="schedule-shell">
          <header className="schedule-header">
            <p className="eyebrow">Staff Portal</p>
            <h1>Teaching Schedule</h1>
            <p className="subtitle">Your week arranged in a vertical teaching timeline.</p>
          </header>

          <section className="week-stack" aria-label="Staff weekly schedule">
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p>Loading your schedule...</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <main className="schedule-shell">
          <header className="schedule-header">
            <p className="eyebrow">Staff Portal</p>
            <h1>Teaching Schedule</h1>
            <p className="subtitle">Your week arranged in a vertical teaching timeline.</p>
          </header>

          <section className="week-stack" aria-label="Staff weekly schedule">
            <div style={{ 
              padding: "2rem", 
              textAlign: "center",
              backgroundColor: "#fee",
              borderRadius: "0.5rem",
              border: "1px solid #fcc",
            }}>
              <p style={{ color: "#c33", marginBottom: "0.5rem" }}>
                <strong>Error loading schedule:</strong>
              </p>
              <p style={{ color: "#666" }}>{error}</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!scheduleData || !scheduleData.isPublished) {
    return (
      <div className="page-container">
        <main className="schedule-shell">
          <header className="schedule-header">
            <p className="eyebrow">Staff Portal</p>
            <h1>Teaching Schedule</h1>
            <p className="subtitle">Your week arranged in a vertical teaching timeline.</p>
          </header>

          <section className="week-stack" aria-label="Staff weekly schedule">
            <div style={{ 
              padding: "2rem", 
              textAlign: "center",
              backgroundColor: "#eff",
              borderRadius: "0.5rem",
              border: "1px solid #ccf",
            }}>
              <p style={{ color: "#0066cc" }}>
                No published schedule available yet. Check back soon!
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const { dayBlocks } = scheduleData;
  const totalSessions = dayBlocks.reduce((sum, day) => sum + (day.sessions?.length || 0), 0);

  return (
    <div className="page-container">
      <main className="schedule-shell">
        <header className="schedule-header">
          <p className="eyebrow">Staff Portal</p>
          <h1>Teaching Schedule</h1>
          <p className="subtitle">Your week arranged in a vertical teaching timeline.</p>
        </header>

        {totalSessions === 0 ? (
          <section className="week-stack" aria-label="Staff weekly schedule">
            <div style={{ 
              padding: "2rem", 
              textAlign: "center",
              backgroundColor: "#f0f0f0",
              borderRadius: "0.5rem",
            }}>
              <p>No teaching sessions assigned for this term.</p>
            </div>
          </section>
        ) : (
          <section className="week-stack" aria-label="Staff weekly schedule">
            {dayBlocks.map((dayBlock) => (
              <article className="day-section" key={dayBlock.day}>
                <div className="day-title-row">
                  <h2>{dayBlock.day}</h2>
                  <span className="day-count">
                    {dayBlock.sessions.length} {dayBlock.sessions.length === 1 ? "session" : "sessions"}
                  </span>
                </div>

                {dayBlock.sessions.length === 0 ? (
                  <p className="day-empty">No teaching sessions scheduled.</p>
                ) : (
                  <div className="session-list">
                    {dayBlock.sessions.map((session) => (
                      <article
                        className="session-card"
                        key={`${dayBlock.day}-${session.time}-${session.courseCode}`}
                      >
                        <div className="session-time">{session.time}</div>

                        <div className="session-content">
                          <div className="title-row">
                            <h3>{session.courseCode}</h3>
                            <span className={`type-badge ${TYPE_CLASS_MAP[session.type] ?? "type-lecture"}`}>
                              {session.type}
                            </span>
                          </div>

                          <p className="course-name">{session.courseName}</p>

                          <div className="meta-grid">
                            <p>
                              <span>Room</span>
                              {session.room}
                            </p>
                            <p>
                              <span>Group</span>
                              {session.group}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
