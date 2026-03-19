import "./styles.css";

const TEACHING_SCHEDULE = [
  {
    day: "Saturday",
    sessions: [
      {
        time: "08:30 - 09:30",
        courseCode: "SET221",
        courseName: "Electronic Design Automation",
        type: "Lecture",
        room: "A207",
        group: "G1",
      },
      {
        time: "11:30 - 12:30",
        courseCode: "SET226",
        courseName: "Control Engineering",
        type: "Lab",
        room: "A202",
        group: "G1-1",
      },
    ],
  },
  {
    day: "Sunday",
    sessions: [
      {
        time: "09:30 - 10:30",
        courseCode: "SET223",
        courseName: "Software Testing, Validation, and Verification",
        type: "Lecture",
        room: "A302",
        group: "G1",
      },
    ],
  },
  {
    day: "Monday",
    sessions: [
      {
        time: "08:30 - 09:30",
        courseCode: "SET224",
        courseName: "Design of Compilers",
        type: "Lecture",
        room: "A207",
        group: "G1",
      },
      {
        time: "10:30 - 11:30",
        courseCode: "SET321",
        courseName: "Software Formal Specifications",
        type: "Tutorial",
        room: "A307",
        group: "G1-1",
      },
    ],
  },
  {
    day: "Tuesday",
    sessions: [
      {
        time: "09:30 - 10:30",
        courseCode: "SET225",
        courseName: "Database Systems",
        type: "Lecture",
        room: "A308",
        group: "G1",
      },
    ],
  },
  {
    day: "Wednesday",
    sessions: [],
  },
];

const TYPE_CLASS_MAP = {
  Lecture: "type-lecture",
  Tutorial: "type-tutorial",
  Lab: "type-lab",
};

export default function ProfessorSchedulePage() {
  return (
    <div className="page-container">
      <main className="schedule-shell">
        <header className="schedule-header">
          <p className="eyebrow">Staff Portal</p>
          <h1>Teaching Schedule</h1>
          <p className="subtitle">Your week arranged in a vertical teaching timeline.</p>
        </header>

        <section className="week-stack" aria-label="Staff weekly schedule">
          {TEACHING_SCHEDULE.map((dayBlock) => (
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
      </main>
    </div>
  );
}
