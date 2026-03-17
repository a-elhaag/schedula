import "./styles.css";

export default function CoordinatorScheduleReviewPage() {
  const reviewStats = [
    { label: "Sessions Scheduled", value: "148", note: "4 unresolved" },
    { label: "Conflicts", value: "3", note: "Down from 11" },
    { label: "Coverage", value: "97%", note: "All departments" },
  ];

  const sessions = [
    {
      time: "Sun  09:00 – 10:30",
      code: "CS301",
      title: "Operating Systems",
      type: "Lecture",
      instructor: "Dr. Mariam Nabil",
      room: "Hall B-12",
      conflict: false,
    },
    {
      time: "Sun  11:00 – 12:30",
      code: "AI402",
      title: "Machine Learning",
      type: "Lecture",
      instructor: "Dr. Youssef Tarek",
      room: "Hall A-01",
      conflict: true,
      conflictNote: "Room double-booked with SE315",
    },
    {
      time: "Mon  09:00 – 10:30",
      code: "IS220",
      title: "Database Systems",
      type: "Lab",
      instructor: "Eng. Ahmed Omar",
      room: "Lab L-04",
      conflict: false,
    },
    {
      time: "Tue  13:00 – 14:30",
      code: "SE315",
      title: "Software Testing",
      type: "Tutorial",
      instructor: "Dr. Sara Hamed",
      room: "Room C-07",
      conflict: false,
    },
  ];

  return (
    <div className="review-page">
      <main className="review-shell">
        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Review Schedule</h1>
          <p className="hero-subtitle">
            Inspect every generated session, resolve flagged conflicts, and
            approve the timetable before publishing to staff and students.
          </p>
        </section>

        <section className="stats-grid reveal reveal-2">
          {reviewStats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-note">{stat.note}</p>
            </article>
          ))}
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Session List</h2>
              <p>Flag conflicts are highlighted. Approve individual sessions or the full schedule.</p>
            </div>
            <div className="panel-actions">
              <button type="button" className="ghost-btn">Resolve All</button>
              <button type="button" className="primary-btn">Approve Schedule</button>
            </div>
          </div>

          <div className="sessions-list">
            {sessions.map((session) => (
              <article
                className={`session-card ${session.conflict ? "session-conflict" : ""}`}
                key={session.code + session.time}
              >
                <div className="session-top">
                  <p className="session-time">{session.time}</p>
                  <div className="session-badges">
                    <span className={`type-badge type-${session.type.toLowerCase()}`}>{session.type}</span>
                    {session.conflict && (
                      <span className="conflict-badge">Conflict</span>
                    )}
                  </div>
                </div>

                <h3>
                  <span className="session-code">{session.code}</span> — {session.title}
                </h3>

                <div className="session-meta">
                  <p>{session.instructor}</p>
                  <p>{session.room}</p>
                </div>

                {session.conflict && (
                  <p className="conflict-note">{session.conflictNote}</p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="quick-actions reveal reveal-4">
          <button type="button" className="ghost-btn">Export Review Report</button>
          <button type="button" className="ghost-btn">Send for Feedback</button>
          <button type="button" className="ghost-btn">Back to Generate</button>
        </section>
      </main>
    </div>
  );
}
