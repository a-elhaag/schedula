import { Fragment } from "react";
import "./styles.css";

export default function CoordinatorAnalyticsPage() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const slots = [
    "08:00",
    "09:30",
    "11:00",
    "12:30",
    "14:00",
    "15:30",
  ];

  const occupancyByDayAndSlot = {
    Sunday: [32, 44, 61, 76, 58, 35],
    Monday: [38, 56, 73, 86, 66, 41],
    Tuesday: [29, 49, 68, 81, 71, 47],
    Wednesday: [34, 52, 77, 90, 69, 43],
    Thursday: [22, 36, 54, 63, 48, 30],
  };

  const usageClass = (value) => {
    if (value >= 85) return "heat-level-5";
    if (value >= 70) return "heat-level-4";
    if (value >= 55) return "heat-level-3";
    if (value >= 40) return "heat-level-2";
    return "heat-level-1";
  };

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
        </section>

        <section className="heatmap-card" aria-label="Room occupancy by day and time">
          <div className="legend-row" aria-hidden="true">
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

          <div className="heatmap-grid" role="table" aria-label="Occupancy heatmap table">
            <div className="corner-cell" aria-hidden="true">
              Day / Slot
            </div>
            {slots.map((slot) => (
              <div key={slot} className="slot-header" role="columnheader">
                {slot}
              </div>
            ))}

            {days.map((day, dayIndex) => (
              <Fragment key={day}>
                <div className="day-label" role="rowheader">
                  {day}
                </div>

                {occupancyByDayAndSlot[day].map((value, slotIndex) => (
                  <button
                    key={`${day}-${slots[slotIndex]}`}
                    type="button"
                    className={`heat-cell ${usageClass(value)}`}
                    title={`${day} ${slots[slotIndex]}: ${value}% occupied`}
                    style={{ animationDelay: `${dayIndex * 80 + slotIndex * 45}ms` }}
                  >
                    <span>{value}%</span>
                  </button>
                ))}
              </Fragment>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

