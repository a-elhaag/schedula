import "./styles.css";

export default function ProfessorAvailabilityPage() {
  const weeklySlots = [
    {
      day: "Sunday",
      slots: ["09:00 - 11:00", "13:00 - 15:00"],
      status: "Available",
    },
    {
      day: "Monday",
      slots: ["10:00 - 12:00"],
      status: "Preferred",
    },
    {
      day: "Tuesday",
      slots: ["08:00 - 10:00", "12:00 - 14:00", "16:00 - 18:00"],
      status: "Available",
    },
    {
      day: "Wednesday",
      slots: [],
      status: "Unavailable",
    },
    {
      day: "Thursday",
      slots: ["09:00 - 11:00"],
      status: "Preferred",
    },
  ];

  const quickStats = [
    { label: "Total Slots", value: "7" },
    { label: "Preferred", value: "2" },
    { label: "Unavailable Days", value: "1" },
  ];

  return (
    <main className="availability-page">
      <section className="availability-shell">
        <header className="availability-header reveal" style={{ "--delay": "0ms" }}>
          <p className="eyebrow">Staff Panel</p>
          <h1>Availability Planner</h1>
          <p className="subtitle">
            Configure when you are available for lectures, tutorials, and labs.
          </p>
        </header>

        <section className="status-card reveal" style={{ "--delay": "90ms" }}>
          <div>
            <p className="status-label">Submission Status</p>
            <h2>Draft in progress</h2>
            <p className="status-note">Last updated today at 10:42 AM</p>
          </div>
          <button type="button" className="save-button">
            Save Availability
          </button>
        </section>

        <section className="stats-grid">
          {quickStats.map((stat, index) => (
            <article
              key={stat.label}
              className="stat-card reveal"
              style={{ "--delay": `${140 + index * 70}ms` }}
            >
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="week-grid">
          {weeklySlots.map((item, index) => (
            <article
              key={item.day}
              className="day-card reveal"
              style={{ "--delay": `${280 + index * 80}ms` }}
            >
              <div className="day-top-row">
                <h3>{item.day}</h3>
                <span className={`status-pill status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </div>

              {item.slots.length ? (
                <ul>
                  {item.slots.map((slot) => (
                    <li key={slot}>{slot}</li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No teaching window selected</p>
              )}

              <button type="button" className="edit-link">
                Edit day
              </button>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
