"use client";

import { useEffect, useState, Fragment } from "react";
import { useFetch } from "@/hooks/useFetch";
import "./styles.css";

export default function CoordinatorAnalyticsPage() {
  const [termLabel, setTermLabel] = useState("");
  const [occupancyData, setOccupancyData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { data, error, loading: fetchLoading } = useFetch(
    `/api/coordinator/analytics?term=${encodeURIComponent(termLabel)}`,
    { method: "GET" }
  );

  useEffect(() => {
    if (data) {
      setOccupancyData(data);
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    setLoading(fetchLoading);
  }, [fetchLoading]);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const slots = ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30"];

  const usageClass = (value) => {
    if (value >= 85) return "heat-level-5";
    if (value >= 70) return "heat-level-4";
    if (value >= 55) return "heat-level-3";
    if (value >= 40) return "heat-level-2";
    return "heat-level-1";
  };

  if (error) {
    return (
      <div className="page-container">
        <main className="analytics-shell">
          <section className="analytics-hero">
            <h1>Analytics</h1>
          </section>
          <div className="error-state">
            <h2>Error loading analytics data</h2>
            <p>{error.message || "Unknown error"}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <main className="analytics-shell">
        <section className="analytics-hero">
          <p className="hero-eyebrow">Coordinator Analytics</p>
          <h1>Room Occupancy Heatmap</h1>
          <p>
            Visualize room usage by day and timeslot to spot overload periods
            and improve schedule balance.
          </p>
          <div className="filter-row">
            <input
              type="text"
              placeholder="Term label (e.g., Spring 2026)"
              value={termLabel}
              onChange={(e) => setTermLabel(e.target.value)}
              className="input"
            />
            <button type="button" className="primary-btn" onClick={() => {}}>
              Refresh
            </button>
          </div>
        </section>

        {loading ? (
          <div className="skeleton-grid">
            {days.map((_, i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        ) : occupancyData ? (
          <section className="heatmap-card" aria-label="Room occupancy by day and time">
            <div className="legend-row">
              <span>Low</span>
              <div className="legend-scale">
                <span className="legend-dot heat-level-1" />
                <span className="legend-dot heat-level-2" />
                <span className="legend-dot heat-level-3" />
                <span className="legend-dot heat-level-4" />
                <span className="legend-dot heat-level-5" />
              </div>
              <span>High</span>
            </div>
            <div className="stats-row">
              <p>Avg Occupancy: <strong>{occupancyData.summary?.avgOccupancy || 0}%</strong></p>
              <button type="button" className="ghost-btn">Export CSV</button>
            </div>

            <div className="heatmap-grid">
              <div className="corner-cell">Day / Slot</div>
              {slots.map((slot) => (
                <div key={slot} className="slot-header">{slot}</div>
              ))}

              {days.map((day, dayIndex) => (
                <Fragment key={day}>
                  <div className="day-label">{day}</div>
                  {occupancyData.occupancy[day]?.map((value, slotIndex) => (
                    <button
                      key={`${day}-${slots[slotIndex]}`}
                      type="button"
                      className={`heat-cell ${usageClass(value)}`}
                      title={`${day} ${slots[slotIndex]}: ${value}% occupied`}
                      style={{ animationDelay: `${dayIndex * 80 + slotIndex * 45}ms` }}
                    >
                      <span>{value}%</span>
                    </button>
                  )) || slots.map((_, i) => (
                    <div key={i} className="heat-cell heat-level-0" />
                  ))}
                </Fragment>
              ))}
            </div>
          </section>
        ) : (
          <div className="empty-state">
            <p>No analytics data available. Generate a schedule first.</p>
          </div>
        )}
      </main>
    </div>
  );
}

