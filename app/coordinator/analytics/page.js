"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import "./styles.css";

import { StatCard }  from "@/components/StatCard";
import Spinner       from "@/components/Spinner";
import SkeletonPage  from "@/components/SkeletonPage";
import ErrorState    from "@/components/ErrorState";
import Button        from "@/components/Button";
import { BoltIcon, CalendarIcon, WarningIcon } from "@/components/icons/index";

const DAYS  = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
const SLOTS = ["07:30","08:30","09:30","10:30","11:30","12:30","1:30","2:30","3:30","4:30"];

function usageClass(value) {
  if (value >= 85) return "heat-level-5";
  if (value >= 70) return "heat-level-4";
  if (value >= 55) return "heat-level-3";
  if (value >= 40) return "heat-level-2";
  return "heat-level-1";
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoordinatorAnalyticsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/coordinator/analytics");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonPage stats={3} rows={5} />;
  if (error)   return <div className="page-container"><ErrorState message={error} onRetry={load} /></div>;

  const heatmap     = data?.heatmap     ?? {};
  const stats       = data?.stats       ?? {};
  const topRooms    = data?.topRooms    ?? [];
  const activeDays  = data?.activeDays  ?? [];

  return (
    <div className="page-container">
      <main className="analytics-shell">

        <div className="page-header">
          <h1>Analytics</h1>
          <p>Visualize room usage by day and timeslot to spot overload periods and improve schedule balance.</p>
        </div>

        {/* Stats */}
        <section className="stats-grid reveal reveal-2">
          <StatCard label="Total Sessions"  value={String(stats.totalSessions ?? 0)}  trend="This term"          Icon={CalendarIcon} />
          <StatCard label="Peak Occupancy"  value={`${stats.peakOccupancy ?? 0}%`}    trend={stats.peakSlot ?? "--"} Icon={BoltIcon} />
          <StatCard label="Rooms Used"      value={String(stats.roomsUsed ?? 0)}      trend={`of ${stats.totalRooms ?? 0} available`} Icon={WarningIcon} />
        </section>

        {/* Heatmap */}
        <section className="heatmap-card reveal reveal-3" aria-label="Room occupancy heatmap">
          <div className="heatmap-header">
            <div>
              <h2>Occupancy by Day and Slot</h2>
              <p>Percentage of rooms occupied at each time slot.</p>
            </div>
            <Button variant="ghost" onClick={load}>Refresh</Button>
          </div>

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

          <div className="heatmap-grid" role="table">
            <div className="corner-cell" aria-hidden="true">Day / Slot</div>
            {SLOTS.map(slot => (
              <div key={slot} className="slot-header" role="columnheader">{slot}</div>
            ))}

            {DAYS.map((day, dayIndex) => (
              <Fragment key={day}>
                <div className="day-label" role="rowheader">{day}</div>
                {SLOTS.map((slot, slotIndex) => {
                  const value = heatmap[day]?.[slot] ?? 0;
                  return (
                    <button
                      key={`${day}-${slot}`}
                      type="button"
                      className={`heat-cell ${usageClass(value)}`}
                      title={`${day} ${slot}: ${value}% occupied`}
                      style={{ animationDelay: `${dayIndex * 80 + slotIndex * 45}ms` }}
                    >
                      <span>{value > 0 ? `${value}%` : ""}</span>
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </section>

        {/* Top rooms + active days */}
        <div className="analytics-bottom reveal reveal-4">
          {topRooms.length > 0 && (
            <section className="panel">
              <h2>Most Used Rooms</h2>
              <div className="top-rooms-list">
                {topRooms.map((r, i) => (
                  <div key={i} className="top-room-row">
                    <span className="top-room-name">{r.name}</span>
                    <div className="fill-track" style={{ flex: 1 }}>
                      <div className="fill-bar" style={{ "--fill-width": `${r.occupancy}%` }} />
                    </div>
                    <span className="top-room-pct">{r.occupancy}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeDays.length > 0 && (
            <section className="panel">
              <h2>Sessions per Day</h2>
              <div className="day-bars">
                {activeDays.map((d, i) => (
                  <div key={i} className="day-bar-row">
                    <span className="day-bar-label">{d.day.slice(0,3)}</span>
                    <div className="fill-track" style={{ flex: 1 }}>
                      <div className="fill-bar" style={{ "--fill-width": `${d.pct}%` }} />
                    </div>
                    <span className="day-bar-count">{d.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

      </main>
    </div>
  );
}