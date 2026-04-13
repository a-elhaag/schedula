"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import Button                from "@/components/Button";
import { StatCard }          from "@/components/StatCard";
import Toast                 from "@/components/Toast";
import Spinner               from "@/components/Spinner";
import SkeletonPage          from "@/components/SkeletonPage";
import ErrorState            from "@/components/ErrorState";
import CoordinatorSessionRow from "@/components/CoordinatorSessionRow";
import { DownloadIcon, CalendarIcon, BoltIcon, UserIcon } from "@/components/icons/index";

const DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];

export default function CoordinatorSchedulePublishedPage() {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeDay,    setActiveDay]    = useState("Saturday");
  const [unpublishing, setUnpublishing] = useState(false);
  const [toast,        setToast]        = useState({ open:false, variant:"info", title:"", message:"", id:0 });

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/coordinator/schedule/published");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
      const firstDay = DAYS.find(d => (json.sessions?.[d]?.length ?? 0) > 0);
      if (firstDay) setActiveDay(firstDay);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUnpublish() {
    if (!data?.scheduleId) return;
    setUnpublishing(true);
    try {
      const res  = await fetch("/api/coordinator/schedule/published", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({ action:"unpublish", scheduleId: data.scheduleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      showToast("info", "Unpublished", "Schedule has been taken offline.");
      load();
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setUnpublishing(false); }
  }

  const sessions    = data?.sessions ?? {};
  const stats       = data?.stats    ?? {};
  const daySessions = sessions[activeDay] ?? [];
  const allSessions = Object.values(sessions).flat();

  if (loading) return <SkeletonPage stats={3} rows={6} />;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  if (!data?.scheduleId) return (
    <div className="courses-page">
      <main className="courses-shell">
        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Published Schedule</h1>
        </section>
        <div className="panel reveal reveal-2" style={{ textAlign:"center", padding:60 }}>
          <h2 style={{ fontFamily:"DM Serif Display,serif", fontSize:24, marginBottom:10 }}>No Published Schedule</h2>
          <p style={{ color:"var(--color-text-muted)", marginBottom:24 }}>
            Generate and approve a schedule first, then it will appear here.
          </p>
          <Button variant="primary" onClick={() => window.location.href="/coordinator/schedule/generate"}>
            Go to Generate
          </Button>
        </div>
      </main>
    </div>
  );

  return (
    <div className="courses-page">
      <main className="courses-shell">

        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Published Schedule</h1>
          <p className="hero-subtitle">
            {data?.termLabel} - Live timetable visible to all staff and students.
          </p>
          {data?.publishedAt && (
            <div className="published-banner">
              Published on {new Date(data.publishedAt).toLocaleDateString()}
            </div>
          )}
        </section>

        <section className="stats-grid reveal reveal-2">
          <StatCard label="Total Sessions" value={String(allSessions.length)} trend={data?.termLabel ?? ""} Icon={CalendarIcon} />
          <StatCard label="Courses"        value={String(stats.courses ?? 0)} trend="Scheduled"            Icon={BoltIcon}     />
          <StatCard label="Staff"          value={String(stats.staff   ?? 0)} trend="Assigned"             Icon={UserIcon}     />
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Timetable</h2>
              <p>Browse sessions by day.</p>
            </div>
            <div className="panel-actions">
              <Button variant="ghost" icon={<DownloadIcon size={14} />}>Export PDF</Button>
              <Button variant="ghost" onClick={handleUnpublish} disabled={unpublishing}>
                {unpublishing ? "..." : "Unpublish"}
              </Button>
            </div>
          </div>

          {/* Day tabs */}
          <div className="day-tabs" style={{ marginBottom:20 }}>
            {DAYS.map(day => {
              const count = (sessions[day] ?? []).length;
              return (
                <button
                  key={day}
                  className={`day-tab ${activeDay === day ? "day-tab--active" : ""}`}
                  onClick={() => setActiveDay(day)}
                >
                  <span className="day-tab__name">{day.slice(0,3)}</span>
                  {count > 0 && (
                    <span className={`day-tab__count ${activeDay === day ? "day-tab__count--active" : ""}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {daySessions.length === 0 ? (
            <p className="empty-msg">No sessions on {activeDay}.</p>
          ) : (
            <div className="sessions-list">
              {/* CoordinatorSessionRow from components/ */}
              {daySessions.map((s, i) => (
                <CoordinatorSessionRow key={i} session={s} hasConflict={false} />
              ))}
            </div>
          )}
        </section>

        {/* Week overview */}
        <section className="panel reveal reveal-4">
          <h2 style={{ marginBottom:16 }}>Week at a Glance</h2>
          <div className="week-grid" style={{ gridTemplateColumns:`repeat(${DAYS.length},1fr)` }}>
            {DAYS.map(day => {
              const ds = sessions[day] ?? [];
              return (
                <div
                  key={day}
                  className={`week-day-card ${activeDay === day ? "week-day-card--active" : ""}`}
                  onClick={() => setActiveDay(day)}
                >
                  <div className="week-day-card__header">
                    <span className="week-day-card__name">{day.slice(0,3)}</span>
                    <span className="week-day-card__count">{ds.length}</span>
                  </div>
                  <div className="week-day-card__sessions">
                    {ds.map((s, i) => (
                      <div key={i} className={`week-session-dot week-session-dot--${(s.type??"lecture").toLowerCase()}`} title={s.name} />
                    ))}
                    {ds.length === 0 && <span className="week-day-card__free">Free</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}