"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import Button                from "@/components/Button";
import { StatCard }          from "@/components/StatCard";
import Modal                 from "@/components/Modal";
import Toast                 from "@/components/Toast";
import Spinner               from "@/components/Spinner";
import SkeletonPage          from "@/components/SkeletonPage";
import ErrorState            from "@/components/ErrorState";
import ConflictPanel         from "@/components/ConflictPanel";
import CoordinatorSessionRow from "@/components/CoordinatorSessionRow";
import { CalendarIcon, WarningIcon, BoltIcon } from "@/components/icons/index";

export default function CoordinatorScheduleReviewPage() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [conflicts,  setConflicts]  = useState([]);
  const [approving,  setApproving]  = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [toast,      setToast]      = useState({ open:false, variant:"info", title:"", message:"", id:0 });

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/coordinator/schedule/review");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
      setConflicts(json.conflicts ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove() {
    setApproving(true);
    try {
      const res  = await fetch("/api/coordinator/schedule/review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "approve", scheduleId: data?.scheduleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to approve");
      showToast("success", "Schedule Approved", "The timetable has been published.");
      setShowModal(false);
      load();
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setApproving(false); }
  }

  function dismissConflict(c) {
    setConflicts(prev => prev.filter(x => x !== c));
    showToast("info", "Conflict Dismissed", "You can re-detect conflicts at any time.");
  }

  const conflictSlots = new Set(conflicts.map(c => c.slot));

  if (loading) return <SkeletonPage stats={3} rows={6} />;
  if (error)   return <div className="review-page"><ErrorState message={error} onRetry={load} /></div>;

  const sessions  = data?.sessions  ?? [];
  const stats     = data?.stats     ?? {};
  const published = data?.isPublished ?? false;

  return (
    <div className="review-page">
      <main className="review-shell">

        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Review Schedule</h1>
          <p className="hero-subtitle">
            Inspect every generated session, resolve flagged conflicts, and
            approve the timetable before publishing to staff and students.
          </p>
          {published && <div className="published-banner">Schedule is live and published</div>}
        </section>

        <section className="stats-grid reveal reveal-2">
          <StatCard label="Sessions Scheduled" value={String(stats.totalSessions ?? sessions.length)} trend={`${stats.unresolved ?? 0} unresolved`} trendUp={false} Icon={CalendarIcon} />
          <StatCard label="Conflicts"           value={String(conflicts.length)}                       trend={conflicts.length === 0 ? "All clear" : "Need attention"} trendUp={conflicts.length === 0} Icon={WarningIcon} />
          <StatCard label="Coverage"            value={`${stats.coverage ?? 0}%`}                      trend="Across all departments" trendUp Icon={BoltIcon} />
        </section>

        {/* ConflictPanel from components/ */}
        {conflicts.length > 0 && (
          <ConflictPanel conflicts={conflicts} onDismiss={dismissConflict} />
        )}

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Session List</h2>
              <p>Flagged conflicts are highlighted. Approve the full schedule below.</p>
            </div>
            <div className="panel-actions">
              {conflicts.length > 0 && (
                <Button variant="ghost" onClick={() => setConflicts([])}>Dismiss All</Button>
              )}
              {!published && (
                <Button variant="primary" onClick={() => setShowModal(true)} disabled={conflicts.length > 0}>
                  Approve Schedule
                </Button>
              )}
            </div>
          </div>

          <div className="sessions-list">
            {sessions.length === 0 ? (
              <p className="empty-msg">No sessions found. Generate a schedule first.</p>
            ) : (
              sessions.map((s, i) => (
                /* CoordinatorSessionRow from components/ */
                <CoordinatorSessionRow
                  key={i}
                  session={s}
                  hasConflict={conflictSlots.has(`${s.day}-${s.start}-${s.end}`)}
                />
              ))
            )}
          </div>
        </section>

        <section className="quick-actions reveal reveal-4">
          <Button variant="ghost">Export Review Report</Button>
          <Button variant="ghost">Back to Generate</Button>
        </section>

      </main>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Approve and Publish Schedule"
        description="This will publish the timetable to all staff and students. This action cannot be undone."
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleApprove} disabled={approving}>
              {approving ? "Publishing..." : "Confirm and Publish"}
            </Button>
          </div>
        }
      >
        <div className="approve-summary">
          <p><strong>{sessions.length}</strong> sessions will be published</p>
          <p><strong>{conflicts.length}</strong> unresolved conflicts</p>
        </div>
      </Modal>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}