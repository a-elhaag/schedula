import "./styles.css";

export default function CoordinatorCoursesPage() {
  const statBlocks = [
    { label: "Total Courses", value: "28", meta: "Spring 2026" },
    { label: "Open Sections", value: "64", meta: "8 pending review" },
    { label: "Enrollment", value: "92%", meta: "Across all levels" },
  ];

  const courseCards = [
    {
      code: "CS301",
      title: "Operating Systems",
      type: "Lecture",
      instructor: "Dr. Mariam Nabil",
      sections: 3,
      fillRate: 96,
      slot: "Sun, Tue - 11:00",
    },
    {
      code: "IS220",
      title: "Database Systems",
      type: "Lab",
      instructor: "Eng. Ahmed Omar",
      sections: 4,
      fillRate: 81,
      slot: "Mon, Wed - 13:00",
    },
    {
      code: "SE315",
      title: "Software Testing",
      type: "Tutorial",
      instructor: "Dr. Sara Hamed",
      sections: 2,
      fillRate: 74,
      slot: "Tue, Thu - 09:00",
    },
    {
      code: "AI402",
      title: "Machine Learning",
      type: "Lecture",
      instructor: "Dr. Youssef Tarek",
      sections: 3,
      fillRate: 89,
      slot: "Sun, Wed - 14:30",
    },
  ];

  return (
    <div className="courses-page">
      <main className="courses-shell">
        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Course Offerings</h1>
          <p className="hero-subtitle">
            Build sections, monitor enrollment pressure, and keep every course
            aligned with available rooms and teaching capacity.
          </p>
        </section>

        <section className="stats-grid reveal reveal-2">
          {statBlocks.map((block) => (
            <article className="stat-card" key={block.label}>
              <p className="stat-label">{block.label}</p>
              <p className="stat-value">{block.value}</p>
              <p className="stat-meta">{block.meta}</p>
            </article>
          ))}
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Published Courses</h2>
              <p>Track section health and assignment readiness.</p>
            </div>
            <button type="button" className="primary-btn">
              Create New Course
            </button>
          </div>

          <div className="courses-grid">
            {courseCards.map((course) => (
              <article className="course-card" key={course.code}>
                <div className="course-head">
                  <span className="course-code">{course.code}</span>
                  <span className={`type-badge type-${course.type.toLowerCase()}`}>
                    {course.type}
                  </span>
                </div>

                <h3>{course.title}</h3>
                <p className="instructor">{course.instructor}</p>

                <div className="meta-row">
                  <p>{course.sections} Sections</p>
                  <p>{course.slot}</p>
                </div>

                <div className="fill-row">
                  <p>Enrollment Fill</p>
                  <p>{course.fillRate}%</p>
                </div>
                <div className="fill-track">
                  <div
                    className="fill-bar"
                    style={{ "--fill-width": `${course.fillRate}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="quick-actions reveal reveal-4">
          <button type="button" className="ghost-btn">
            Import Course Data
          </button>
          <button type="button" className="ghost-btn">
            Review Conflicts
          </button>
          <button type="button" className="ghost-btn">
            Export Catalog
          </button>
        </section>
      </main>
    </div>
  );
}
