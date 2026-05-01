"use client";
import { useState, useEffect, useCallback } from "react";
import "./styles.css";
import SkeletonPage from "@/components/SkeletonPage";
import ErrorState from "@/components/ErrorState";
import Toast from "@/components/Toast";
import Button from "@/components/Button";

export default function CoordinatorPublishedPage() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeLevel, setActiveLevel] = useState(null);
  const [toast,       setToast]       = useState({ open: false, variant: "info", title: "", message: "", id: 0 });

  const showToast = (v, t, m) => setToast({ open: true, variant: v, title: t, message: m, id: Date.now() });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/coordinator/schedule/published");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
      if (json.levels?.length > 0 && activeLevel === null) {
        setActiveLevel(json.levels[0].level);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUnpublish() {
    if (!data?.scheduleId) return;
    try {
      const res = await fetch("/api/coordinator/schedule/published", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "unpublish", scheduleId: data.scheduleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast("success", "Unpublished", "Schedule has been unpublished.");
      load();
    } catch (e) {
      showToast("danger", "Error", e.message);
    }
  }

  if (loading) return <SkeletonPage stats={3} rows={5} />;
  if (error)   return <div className="published-page"><ErrorState message={error} onRetry={load} /></div>;

  if (!data?.scheduleId) {
    return (
      <div className="published-page">
        <main className="published-shell">
          <div className="page-header">
            <h1>Published Schedule</h1>
            <p>No published schedule yet. Generate and approve a schedule first.</p>
          </div>
        </main>
      </div>
    );
  }

  const currentLevelData = data.levels?.find(l => l.level === activeLevel);

  return (
    <div className="published-page">
      <main className="published-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div className="page-header">
            <h1>Published Schedule</h1>
            <p>
              {data.termLabel}
              {data.publishedAt ? ` · Published ${new Date(data.publishedAt).toLocaleDateString()}` : ""}
            </p>
          </div>
          <Button variant="ghost" onClick={handleUnpublish}>Unpublish</Button>
        </div>

        <div className="filter-tabs" style={{ marginBottom: 20 }}>
          {(data.levels ?? []).map(lv => (
            <button
              key={lv.level}
              className={`filter-tab${activeLevel === lv.level ? " filter-tab--active" : ""}`}
              onClick={() => setActiveLevel(lv.level)}
            >
              {lv.label}
            </button>
          ))}
        </div>

        {currentLevelData && (
          <ScheduleGrid levelData={currentLevelData} institution={data.institution} />
        )}
      </main>

      <Toast
        key={toast.id}
        open={toast.open}
        variant={toast.variant}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        duration={3200}
      />
    </div>
  );
}

function ScheduleGrid({ levelData, institution }) {
  const workingDays = institution?.working_days ?? ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
  const numPeriods  = institution?.num_periods  ?? 10;
  const periods     = Array.from({ length: numPeriods }, (_, i) => i + 1);
  const columns     = levelData.columns ?? [];

  // Build lookup: "day|period|columnKey" → entry
  const lookup = {};
  for (const entry of (levelData.entries ?? [])) {
    const colKey = entry.subgroup ?? entry.groups_covered?.[0] ?? "";
    if (!colKey) continue;
    const key = `${entry.day}|${entry.period}|${colKey}`;
    if (!lookup[key]) lookup[key] = entry;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={thStyle}>Day</th>
            <th style={thStyle}>Period</th>
            {columns.map(col => (
              <th key={col} style={thStyle}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workingDays.map(day =>
            periods.map((period, pi) => {
              return (
                <tr key={`${day}-${period}`}>
                  {pi === 0 && (
                    <td rowSpan={numPeriods} style={{ ...tdStyle, fontWeight: 700, textAlign: "center", background: "var(--color-surface-raised)", whiteSpace: "nowrap" }}>
                      {day}
                    </td>
                  )}
                  <td style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-muted)", fontSize: 11 }}>
                    P{period}
                  </td>
                  {columns.map(col => {
                    const entry = lookup[`${day}|${period}|${col}`];
                    if (!entry) return <td key={col} style={tdStyle} />;
                    return (
                      <td key={col} style={{ ...tdStyle, ...sessionCellStyle(entry.session_type) }}>
                        <div style={{ fontWeight: 700, fontSize: 11 }}>{entry.room_code}</div>
                        <div style={{ fontWeight: 600 }}>{entry.course_code}</div>
                        <div style={{ fontSize: 10, color: "inherit", opacity: 0.8 }}>{entry.course_name}</div>
                        <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{entry.instructor}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: "8px 10px",
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border)",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "6px 8px",
  border: "1px solid var(--color-border)",
  verticalAlign: "top",
  minWidth: 90,
};

function sessionCellStyle(type) {
  const colors = {
    lecture:  { background: "#EFF6FF", color: "#1D4ED8" },
    tutorial: { background: "#F0FDF4", color: "#166534" },
    lab:      { background: "#FFF7ED", color: "#9A3412" },
  };
  return colors[type] ?? colors.lecture;
}
