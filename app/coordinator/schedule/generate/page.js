"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import "./styles.css";

import Button        from "@/components/Button";
import { StatCard }  from "@/components/StatCard";
import Toast         from "@/components/Toast";
import Spinner       from "@/components/Spinner";
import SkeletonPage  from "@/components/SkeletonPage";
import ErrorState    from "@/components/ErrorState";
import Badge         from "@/components/Badge";
import ProgressBar   from "@/components/ProgressBar";
import JobStatusCard from "@/components/JobStatusCard";
import { BoltIcon, CalendarIcon, RocketIcon } from "@/components/icons/index";
import { ScheduleJobStatus } from "@/lib/scheduleJobContract";

export default function CoordinatorScheduleGeneratePage() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [statusMsg,  setStatusMsg]  = useState("");
  const [elapsed,    setElapsed]    = useState(0);
  const [error,      setError]      = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [toast,      setToast]      = useState({ open:false, variant:"info", title:"", message:"", id:0 });
  const pollRef    = useRef(null);
  const timerRef   = useRef(null);

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/coordinator/schedule/generate");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startElapsedTimer() {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  }

  function stopElapsedTimer() {
    clearInterval(timerRef.current);
  }

  function formatElapsed(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }

  const STATUS_STEPS = [
    "Initializing solver...",
    "Loading courses and rooms...",
    "Building constraint model...",
    "Running CP-SAT solver...",
    "Optimizing soft constraints...",
    "Finalizing timetable...",
  ];

  function startPolling(jobId) {
    let tick = 0;
    pollRef.current = setInterval(async () => {
      tick++;
      try {
        const res  = await fetch(`/api/coordinator/schedule/generate?jobId=${jobId}`);
        const json = await res.json();
        const stepMsg = STATUS_STEPS[Math.min(Math.floor(tick / 2), STATUS_STEPS.length - 1)];
        setProgress(Math.min(tick * 8, 95));
        setStatusMsg(json.statusMessage ?? stepMsg);

        const done = [
          ScheduleJobStatus.COMPLETED,
          ScheduleJobStatus.COMPLETED_FALLBACK,
          ScheduleJobStatus.FAILED_INFEASIBLE,
          ScheduleJobStatus.FAILED,
        ].includes(json.status);

        if (done) {
          clearInterval(pollRef.current);
          stopElapsedTimer();
          setGenerating(false);
          setProgress(100);

          const s = json.stats ?? {};
          const assigned = s.totalAssigned ?? s.assignedSessions ?? 0;
          const total    = s.totalSessions ?? 0;

          if (json.status === ScheduleJobStatus.COMPLETED) {
            setStatusMsg("Schedule generated successfully.");
            const relaxed = s.availabilityRelaxed ?? false;
            setGenerationError(relaxed ? {
              type: "partial", assigned, total, missing: 0,
              backtracks: s.backtracks ?? 0, relaxed: true, phase: s.phase,
            } : null);
            showToast("success", "Done", `${assigned} sessions scheduled.`);
          } else if (json.status === ScheduleJobStatus.COMPLETED_FALLBACK) {
            setStatusMsg("Partial schedule — not all sessions could be placed.");
            setGenerationError({
              type:           "partial",
              assigned,
              total,
              missing:        total - assigned,
              backtracks:     s.backtracks ?? 0,
              relaxed:        s.availabilityRelaxed ?? false,
              overTarget:     s.unitsOverTarget ?? null,
              phase:          s.phase,
            });
            showToast("warning", "Partial Result", `${assigned} of ${total} sessions placed.`);
          } else if (json.status === ScheduleJobStatus.FAILED_INFEASIBLE) {
            setStatusMsg("No valid schedule found.");
            setGenerationError({
              type:    "infeasible",
              details: json.error?.details ?? [],
              message: json.error?.message ?? "Solver could not find valid slots.",
            });
            showToast("danger", "Infeasible", json.error?.message ?? "No valid schedule.");
          } else {
            setStatusMsg("Solver error.");
            setGenerationError({ type: "error", message: json.error?.message ?? "Unknown error." });
            showToast("danger", "Error", json.error?.message ?? "Solver failed.");
          }
          load();
        }
      } catch (e) {
        clearInterval(pollRef.current);
        stopElapsedTimer();
        setGenerating(false);
      }
    }, 2000);
  }

  useEffect(() => () => { clearInterval(pollRef.current); clearInterval(timerRef.current); }, []);

  async function handleGenerate() {
    setGenerating(true);
    setGenerationError(null);
    setProgress(5);
    setStatusMsg("Initializing solver...");
    startElapsedTimer();
    try {
      const res  = await fetch("/api/coordinator/schedule/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "generate" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to start");
      if (json.jobId) {
        startPolling(json.jobId);
      } else if (json.schedule) {
        setProgress(100);
        setStatusMsg("Schedule generated.");
        setGenerating(false);
        showToast("success", "Done", "Schedule generated successfully.");
        load();
      }
    } catch (e) {
      setGenerationError(e.message);
      setGenerating(false);
      showToast("danger", "Error", e.message);
    }
  }

  const jobs      = data?.recentJobs  ?? [];
  const stats     = data?.stats       ?? {};
  const readiness = data?.readiness   ?? {};

  if (loading) return <SkeletonPage stats={3} rows={5} />;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="courses-page">
      <main className="courses-shell">

        <div className="page-header">
          <h1>Generate Schedule</h1>
          <p>Run the constraint-based solver to generate an optimal timetable from your courses, staff availability, and room data.</p>
        </div>

        <section className="stats-grid reveal reveal-2">
          <StatCard label="Courses" value={String(stats.courses ?? 0)} trend="Ready for scheduling" Icon={CalendarIcon} />
          <StatCard label="Staff"   value={String(stats.staff   ?? 0)} trend="With availability"    Icon={BoltIcon}     />
          <StatCard label="Rooms"   value={String(stats.rooms   ?? 0)} trend="Available"            Icon={RocketIcon}   />
        </section>

        {/* Readiness checklist */}
        <section className="panel reveal reveal-2">
          <div className="panel-head">
            <div>
              <h2>Pre-Generation Checklist</h2>
              <p>All items must be ready before generating a schedule.</p>
            </div>
          </div>
          <div className="constraints-list">
            {[
              { key:"courses",      label:"Courses imported",             ok: readiness.courses      },
              { key:"staff",        label:"Staff members added",          ok: readiness.staff        },
              { key:"levels",       label:"Groups & levels configured",   ok: readiness.levels       },
              { key:"availability", label:"Staff availability submitted", ok: readiness.availability },
            ].map(item => (
              <div key={item.key} className="constraint-row">
                <div className="constraint-row__info">
                  <p className="constraint-row__label">{item.label}</p>
                </div>
                <Badge variant={item.ok ? "success" : "warning"} size="sm">
                  {item.ok ? "Ready" : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Generator panel */}
        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Solver</h2>
              <p>Complete the checklist above before generating.</p>
            </div>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={generating}
              icon={<RocketIcon size={15} />}
            >
              {generating ? "Generating..." : "Generate Schedule"}
            </Button>
          </div>

          {generating && (
            <div className="gen-status">
              <div className="gen-status__header">
                <span className="gen-status__label">
                  <span className="gen-status__dot" />
                  Solver running
                </span>
                <span className="gen-status__timer">{formatElapsed(elapsed)}</span>
              </div>
              <ProgressBar value={progress} label={statusMsg} />
              <p className="gen-status__hint">
                Please wait — this can take up to 2 minutes depending on the
                number of courses, staff, and constraints.
              </p>
            </div>
          )}

          {!generating && jobs.length === 0 && (
            <p className="empty-msg">No schedules generated yet.</p>
          )}

          {!generating && generationError && (
            <SolverFeedback error={generationError} />
          )}
        </section>

        {/* Recent jobs */}
        {jobs.length > 0 && (
          <section className="panel reveal reveal-4">
            <h2 style={{ marginBottom:16 }}>Recent Jobs</h2>
            <div className="sessions-list">
              {/* JobStatusCard from components/ */}
              {jobs.map((job, i) => (
                <JobStatusCard key={i} job={job} />
              ))}
            </div>
          </section>
        )}

      </main>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={4000} />
    </div>
  );
}

function SolverFeedback({ error }) {
  if (!error) return null;

  if (error.type === "partial") {
    const pct = error.total > 0 ? Math.round((error.assigned / error.total) * 100) : 0;
    const isGood = pct === 100;
    const bg     = isGood ? "#f0fdf4" : "#fffbeb";
    const border = isGood ? "#86efac" : "#fde68a";
    const title  = isGood ? "#166534" : "#92400e";
    const body   = isGood ? "#14532d" : "#78350f";

    return (
      <div style={{ marginTop: 16, padding: "20px 24px", borderRadius: 16, background: bg, border: `1px solid ${border}` }}>
        <p style={{ fontWeight: 700, color: title, marginBottom: 12 }}>
          {isGood ? "Schedule Generated" : "Partial Schedule Generated"}
        </p>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 12 }}>
          <Stat label="Placed"       value={`${error.assigned} / ${error.total}`} color={title} />
          <Stat label="Coverage"     value={`${pct}%`}                            color={title} />
          {error.missing > 0 && <Stat label="Unplaced" value={String(error.missing)} color="#b91c1c" />}
          {error.overTarget != null && (
            <Stat
              label="Groups >4 days"
              value={error.overTarget === 0 ? "None ✓" : String(error.overTarget)}
              color={error.overTarget === 0 ? "#166534" : "#92400e"}
            />
          )}
        </div>
        {error.relaxed && (
          <p style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8", marginBottom: 8 }}>
            ℹ️ Staff availability was automatically relaxed to fit all sessions. Some staff may be assigned on days outside their preferred availability.
          </p>
        )}
        {error.missing > 0 && (
          <>
            <p style={{ fontSize: 13, color: body }}>Sessions that could not be placed — common causes:</p>
            <ul style={{ fontSize: 13, color: body, paddingLeft: 20, marginTop: 6, lineHeight: 1.8 }}>
              <li>A professor or TA is assigned to too many sessions relative to their available days</li>
              <li>Two courses share the same professor and require the same time slot</li>
              <li>Too many subgroups compete for the same limited room type (labs, tutorials)</li>
            </ul>
            <p style={{ fontSize: 12, color: title, marginTop: 10 }}>
              Review Staff availability and course professor/TA assignments, then regenerate.
            </p>
          </>
        )}
      </div>
    );
  }

  if (error.type === "infeasible") {
    return (
      <div style={{ marginTop: 16, padding: "20px 24px", borderRadius: 16, background: "#fef2f2", border: "1px solid #fecaca" }}>
        <p style={{ fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>No Valid Schedule Found</p>
        <p style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 10 }}>{error.message}</p>
        {error.details?.length > 0 && (
          <ul style={{ fontSize: 12, color: "#7f1d1d", paddingLeft: 20, lineHeight: 1.8 }}>
            {error.details.slice(0, 8).map((d, i) => (
              <li key={i}>{d.course_code} {d.session_type}{d.subgroup ? ` (${d.subgroup})` : ""} — {d.reason}</li>
            ))}
            {error.details.length > 8 && <li>…and {error.details.length - 8} more</li>}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, padding: "20px 24px", borderRadius: 16, background: "#fef2f2", border: "1px solid #fecaca" }}>
      <p style={{ fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>Solver Error</p>
      <p style={{ fontSize: 13, color: "#7f1d1d" }}>{error.message}</p>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}