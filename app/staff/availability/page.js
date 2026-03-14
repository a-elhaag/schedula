"use client";

import { useMemo, useState } from "react";
import "./styles.css";

export default function ProfessorAvailabilityPage() {
  const [personName, setPersonName] = useState("");

  const staffDirectory = [
    { name: "Ahmed Samir", available: true, note: "Available today 09:00 - 15:00" },
    { name: "Mona Adel", available: false, note: "Unavailable today" },
    { name: "Youssef Nabil", available: true, note: "Available after 12:00" },
    { name: "Sara Hany", available: false, note: "On leave" },
    { name: "Nour Salah", available: true, note: "Available for labs only" },
  ];

  const lookupResult = useMemo(() => {
    const normalized = personName.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const exactMatch = staffDirectory.find((person) => person.name.toLowerCase() === normalized);
    if (exactMatch) {
      return exactMatch;
    }
    const partialMatch = staffDirectory.find((person) =>
      person.name.toLowerCase().includes(normalized),
    );
    return partialMatch || { missing: true };
  }, [personName]);

  const weeklySlots = [
    {
      day: "Saturday",
      slots: ["08:30 - 10:30", "12:00 - 14:00"],
      status: "Available",
    },
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
          <h1>Availability Studio</h1>
          <p className="subtitle">
            Check people instantly and manage your weekly teaching windows in one view.
          </p>
        </header>

        <section className="studio-grid">
          <aside className="left-panel reveal" style={{ "--delay": "70ms" }}>
            <section className="lookup-card">
              <div className="lookup-copy">
                <p className="status-label">Quick Check</p>
                <h2>Search by name</h2>
              </div>

              <label className="lookup-input-wrap" htmlFor="personName">
                <span>Staff Name</span>
                <input
                  id="personName"
                  type="text"
                  value={personName}
                  onChange={(event) => setPersonName(event.target.value)}
                  placeholder="Ahmed / Mona / Youssef"
                />
              </label>

              <div className="quick-tags">
                {staffDirectory.slice(0, 4).map((person) => (
                  <button
                    key={person.name}
                    type="button"
                    className="tag-button"
                    onClick={() => setPersonName(person.name)}
                  >
                    {person.name}
                  </button>
                ))}
              </div>

              {lookupResult ? (
                lookupResult.missing ? (
                  <p className="lookup-result lookup-missing">Name not found in current list.</p>
                ) : (
                  <div
                    className={`lookup-result ${lookupResult.available ? "lookup-available" : "lookup-unavailable"}`}
                  >
                    <strong>{lookupResult.available ? "Available" : "Not available"}</strong>
                    <span>{lookupResult.name}</span>
                    <span>{lookupResult.note}</span>
                  </div>
                )
              ) : (
                <p className="lookup-hint">Start typing to see instant result.</p>
              )}
            </section>

            <section className="status-card">
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
                  style={{ "--delay": `${180 + index * 70}ms` }}
                >
                  <p>{stat.label}</p>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </section>
          </aside>

          <section className="right-panel reveal" style={{ "--delay": "130ms" }}>
            <div className="timeline-header">
              <h2>Weekly Windows</h2>
              <p>Choose the slots where you can teach this week.</p>
            </div>

            <div className="week-grid">
              {weeklySlots.map((item, index) => (
                <article
                  key={item.day}
                  className="day-card reveal"
                  style={{ "--delay": `${240 + index * 80}ms` }}
                >
                  <div className="day-top-row">
                    <h3>{item.day}</h3>
                    <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
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
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
