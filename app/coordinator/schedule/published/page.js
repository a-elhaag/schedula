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
  const [revisions,    setRevisions]    = useState([]);
  const [leftRevision, setLeftRevision] = useState("");
  const [rightRevision, setRightRevision] = useState("");
  const [compareData,  setCompareData]  = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
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

      const revRes = await fetch(`/api/coordinator/schedule/revisions?termLabel=${encodeURIComponent(json.termLabel ?? "")}`);
      const revJson = await revRes.json();
      if (!revRes.ok) throw new Error(revJson.message ?? "Failed to load revisions");
      const sortedRevisions = revJson.revisions ?? [];
      setRevisions(sortedRevisions);

      if (sortedRevisions.length >= 2) {
        const left = String(sortedRevisions[1].revisionNumber);
        const right = String(sortedRevisions[0].revisionNumber);
        setLeftRevision(left);
        setRightRevision(right);
      } else if (sortedRevisions.length === 1) {
        const only = String(sortedRevisions[0].revisionNumber);
        setLeftRevision(only);
        setRightRevision(only);
      }

      const firstDay = DAYS.find(d => (json.sessions?.[d]?.length ?? 0) > 0);
      if (firstDay) setActiveDay(firstDay);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadComparison = useCallback(async () => {
    if (!leftRevision || !rightRevision || !data?.termLabel) {
      setCompareData(null);
      return;
    }
    if (leftRevision === rightRevision) {
      setCompareData(null);
      setCompareError("Choose two different revisions to compare.");
      return;
    }

    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await fetch(
        `/api/coordinator/schedule/revisions/compare?termLabel=${encodeURIComponent(
          data.termLabel
        )}&left=${encodeURIComponent(leftRevision)}&right=${encodeURIComponent(rightRevision)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to compare revisions");
      setCompareData(json);
    } catch (e) {
      setCompareData(null);
      setCompareError(e.message);
    } finally {
      setCompareLoading(false);
    }
  }, [leftRevision, rightRevision, data?.termLabel]);

  useEffect(() => {
    if (!loading && data?.termLabel && leftRevision && rightRevision) {
      loadComparison();
    }
  }, [loading, data?.termLabel, leftRevision, rightRevision, loadComparison]);

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

        <section className="panel reveal reveal-2">
          <div className="panel-head">
            <div>
              <h2>Revision History & Compare</h2>
              <p>Select two revisions to inspect schedule changes before and after publication updates.</p>
            </div>
          </div>

          {revisions.length === 0 ? (
            <p className="empty-msg">No schedule revisions available yet.</p>
          ) : (
            <>
              <div className="revision-controls">
                <label className="revision-field">
                  <span>Baseline revision</span>
                  <select value={leftRevision} onChange={(e) => setLeftRevision(e.target.value)}>
                    {revisions.map((rev) => (
                      <option key={`left-${rev.id}`} value={String(rev.revisionNumber)}>
                        Rev {rev.revisionNumber} ({rev.sessionCount} sessions)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="revision-field">
                  <span>Compare against</span>
                  <select value={rightRevision} onChange={(e) => setRightRevision(e.target.value)}>
                    {revisions.map((rev) => (
                      <option key={`right-${rev.id}`} value={String(rev.revisionNumber)}>
                        Rev {rev.revisionNumber} ({rev.sessionCount} sessions)
                      </option>
                    ))}
                  </select>
                </label>

                <Button variant="ghost" onClick={loadComparison} disabled={compareLoading || !leftRevision || !rightRevision}>
                  {compareLoading ? "Comparing..." : "Compare Revisions"}
                </Button>
              </div>

              {compareError && <p className="revision-error">{compareError}</p>}

              {compareData && (
                <div className="revision-summary-grid">
                  <div className="revision-stat">
                    <p className="revision-stat__label">Added Sessions</p>
                    <p className="revision-stat__value revision-stat__value--added">{compareData.summary.added}</p>
                  </div>
                  <div className="revision-stat">
                    <p className="revision-stat__label">Removed Sessions</p>
                    <p className="revision-stat__value revision-stat__value--removed">{compareData.summary.removed}</p>
                  </div>
                  <div className="revision-stat">
                    <p className="revision-stat__label">Reassigned Slots</p>
                    <p className="revision-stat__value revision-stat__value--updated">{compareData.summary.reassigned}</p>
                  </div>
                  <div className="revision-stat">
                    <p className="revision-stat__label">Unchanged Sessions</p>
                    <p className="revision-stat__value">{compareData.summary.unchanged}</p>
                  </div>
                </div>
              )}

              {compareData && (
                <div className="revision-change-lists">
                  <div>
                    <h3>Added</h3>
                    {(compareData.changes.added ?? []).slice(0, 5).map((item, idx) => (
                      <p key={`added-${idx}`} className="revision-change-item">
                        {item.day} {item.start}-{item.end} · {item.code} · {item.room}
                      </p>
                    ))}
                    {(compareData.changes.added ?? []).length === 0 && (
                      <p className="revision-change-item revision-change-item--muted">No added sessions.</p>
                    )}
                  </div>

                  <div>
                    <h3>Removed</h3>
                    {(compareData.changes.removed ?? []).slice(0, 5).map((item, idx) => (
                      <p key={`removed-${idx}`} className="revision-change-item">
                        {item.day} {item.start}-{item.end} · {item.code} · {item.room}
                      </p>
                    ))}
                    {(compareData.changes.removed ?? []).length === 0 && (
                      <p className="revision-change-item revision-change-item--muted">No removed sessions.</p>
                    )}
                  </div>

                  <div>
                    <h3>Reassigned</h3>
                    {(compareData.changes.reassigned ?? []).slice(0, 5).map((change, idx) => (
                      <p key={`reassigned-${idx}`} className="revision-change-item">
                        {change.after?.code} · {change.before?.room} to {change.after?.room}
                      </p>
                    ))}
                    {(compareData.changes.reassigned ?? []).length === 0 && (
                      <p className="revision-change-item revision-change-item--muted">No reassigned sessions.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
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