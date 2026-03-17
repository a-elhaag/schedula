import "./styles.css";

export default function CoordinatorStaffPage() {
  const overviewStats = [
    { label: "Academic Staff", value: "52", trend: "+4 this term" },
    { label: "Teaching Assistants", value: "31", trend: "+2 this week" },
    { label: "Coverage", value: "94%", trend: "3 gaps left" },
  ];

  const staffMembers = [
    {
      initials: "MN",
      name: "Dr. Mariam Nabil",
      role: "Professor",
      department: "Computer Science",
      workload: 86,
      status: "Available",
    },
    {
      initials: "AO",
      name: "Ahmed Omar",
      role: "Teaching Assistant",
      department: "Information Systems",
      workload: 72,
      status: "Limited",
    },
    {
      initials: "SH",
      name: "Sara Hamed",
      role: "Assistant Lecturer",
      department: "Software Engineering",
      workload: 61,
      status: "Available",
    },
    {
      initials: "YT",
      name: "Youssef Tarek",
      role: "Professor",
      department: "Artificial Intelligence",
      workload: 91,
      status: "High Load",
    },
  ];

  return (
    <div className="staff-page">
      <main className="staff-shell">
        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Staff Management</h1>
          <p className="hero-subtitle">
            Coordinate faculty and teaching assistants, balance workload, and
            fill scheduling gaps before timetable generation.
          </p>
        </section>

        <section className="overview-grid reveal reveal-2">
          {overviewStats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-trend">{stat.trend}</p>
            </article>
          ))}
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Assigned Staff</h2>
              <p>Overview of availability and current teaching load.</p>
            </div>
            <button type="button" className="primary-btn">
              Add Staff Member
            </button>
          </div>

          <div className="staff-grid">
            {staffMembers.map((member) => (
              <article className="member-card" key={member.name}>
                <div className="member-header">
                  <div className="avatar">{member.initials}</div>
                  <span className="role-badge">{member.role}</span>
                </div>

                <h3>{member.name}</h3>
                <p className="member-department">{member.department}</p>

                <div className="meter-row">
                  <p>Load</p>
                  <p>{member.workload}%</p>
                </div>
                <div className="meter-track">
                  <div
                    className="meter-fill"
                    style={{ "--workload": `${member.workload}%` }}
                  />
                </div>

                <p className="member-status">Status: {member.status}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="quick-actions reveal reveal-4">
          <button type="button" className="ghost-btn">
            Import Staff List
          </button>
          <button type="button" className="ghost-btn">
            Manage Constraints
          </button>
          <button type="button" className="ghost-btn">
            Export Summary
          </button>
        </section>
      </main>
    </div>
  );
}
