import "./styles.css";

const STUDENT_SCHEDULE = [
  {
    day: "Saturday",
    sessions: [
      {
        time: "08:30 - 09:30",
        code: "SET222",
        course: "Design and Analysis of Algorithms",
        type: "Lecture",
        room: "A307",
        instructor: "Dr. Mohammad Meiad",
      },
      {
        time: "09:30 - 10:30",
        code: "SET223",
        course: "Software Testing, Validation, and Verification",
        type: "Lecture",
        room: "A302",
        instructor: "Dr. Sabah Saad",
      },
    ],
  },
  {
    day: "Sunday",
    sessions: [
      {
        time: "08:30 - 09:30",
        code: "SET221",
        course: "Electronic Design Automation",
        type: "Lecture",
        room: "A207",
        instructor: "Dr. Myar Ali",
      },
      {
        time: "10:30 - 11:30",
        code: "PHM114",
        course: "Statistics and Probability for Engineering",
        type: "Lecture",
        room: "A312",
        instructor: "Dr. Mustafa Abdul-Salam",
      },
    ],
  },
  {
    day: "Monday",
    sessions: [
      {
        time: "08:30 - 09:30",
        code: "SET224",
        course: "Design of Compilers",
        type: "Lecture",
        room: "A207",
        instructor: "Dr. Hisham Reda",
      },
      {
        time: "11:30 - 12:30",
        code: "SET226",
        course: "Control Engineering",
        type: "Tutorial",
        room: "A202",
        instructor: "Dr. Sulaiman Mabrouk",
      },
    ],
  },
  {
    day: "Tuesday",
    sessions: [
      {
        time: "09:30 - 10:30",
        code: "SET225",
        course: "Database Systems",
        type: "Lecture",
        room: "A308",
        instructor: "Dr. Doaa Mabrouk",
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

export default function StudentSchedulePage() {
  return (
    <div className="page-container">
      <main className="schedule-shell">
        <header className="schedule-header">
          <p className="eyebrow">Spring 2026</p>
          <h1>My Weekly Schedule</h1>
        </header>

        <section className="week-stack" aria-label="Student weekly schedule">
          {STUDENT_SCHEDULE.map((dayBlock) => (
            <article className="day-section" key={dayBlock.day}>
              <div className="day-title-row">
                <h2>{dayBlock.day}</h2>
                <span className="day-count">
                  {dayBlock.sessions.length} {dayBlock.sessions.length === 1 ? "session" : "sessions"}
                </span>
              </div>

              {dayBlock.sessions.length === 0 ? (
                <p className="day-empty">No sessions scheduled.</p>
              ) : (
                <div className="session-list">
                  {dayBlock.sessions.map((session) => (
                    <article
                      className="session-card"
                      key={`${dayBlock.day}-${session.time}-${session.code}`}
                    >
                      <div className="session-time">{session.time}</div>

                      <div className="session-content">
                        <div className="title-row">
                          <h3>{session.code}</h3>
                          <span className={`type-badge ${TYPE_CLASS_MAP[session.type] ?? "type-lecture"}`}>
                            {session.type}
                          </span>
                        </div>

                        <p className="course-name">{session.course}</p>

                        <div className="meta-grid">
                          <p>
                            <span>Room</span>
                            {session.room}
                          </p>
                          <p>
                            <span>Instructor</span>
                            {session.instructor}
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
