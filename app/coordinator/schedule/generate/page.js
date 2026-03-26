"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import "./styles.css";

import Button        from "@/components/Button";
import { StatCard }  from "@/components/StatCard";
import Toast         from "@/components/Toast";
import Spinner       from "@/components/Spinner";
import ErrorState    from "@/components/ErrorState";
import Badge         from "@/components/Badge";
import ProgressBar   from "@/components/ProgressBar";
import JobStatusCard from "@/components/JobStatusCard";
import { BoltIcon, CalendarIcon, RocketIcon } from "@/components/icons/index";

export default function CoordinatorScheduleGeneratePage() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [statusMsg,  setStatusMsg]  = useState("");
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState({ open:false, variant:"info", title:"", message:"", id:0 });
  const pollRef = useRef(null);

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

  function startPolling(jobId) {
    let tick = 0;
    pollRef.current = setInterval(async () => {
      tick++;
      try {
        const res  = await fetch(`/api/coordinator/schedule/generate?jobId=${jobId}`);
        const json = await res.json();
        setProgress(Math.min(tick * 8, 95));
        setStatusMsg(json.statusMessage ?? "Solver is running...");
        if (json.status === "completed") {
          clearInterval(pollRef.current);
          setProgress(100);
          setStatusMsg("Schedule generated successfully.");
          setGenerating(false);
          showToast("success", "Done", "Schedule generated and saved.");
          load();
        } else if (json.status === "failed") {
          clearInterval(pollRef.current);
          setGenerating(false);
          showToast("danger", "Failed", json.error ?? "Solver encountered an error.");
          load();
        }
      } catch (e) {
        clearInterval(pollRef.current);
        setGenerating(false);
      }
    }, 2000);
  }

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function handleGenerate() {
    setGenerating(true);
    setProgress(5);
    setStatusMsg("Initializing solver...");
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
      setGenerating(false);
      showToast("danger", "Error", e.message);
    }
  }

  const jobs      = data?.recentJobs  ?? [];
  const stats     = data?.stats       ?? {};
  const readiness = data?.readiness   ?? {};

  if (loading) return <div className="courses-page"><div className="review-loading"><Spinner size="lg" /></div></div>;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="courses-page">
      <main className="courses-shell">

        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Generate Schedule</h1>
          <p className="hero-subtitle">
            Run the constraint-based solver to generate an optimal timetable
            from your courses, staff availability, and room data.
          </p>
        </section>

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
              { key:"rooms",        label:"Rooms configured",             ok: readiness.rooms        },
              { key:"availability", label:"Staff availability submitted", ok: readiness.availability },
              { key:"constraints",  label:"Scheduling constraints saved", ok: readiness.constraints  },
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
              {/* ProgressBar from components/ */}
              <ProgressBar value={progress} label={statusMsg} />
              <p className="gen-status__hint">
                This may take a few minutes depending on the number of courses and constraints.
              </p>
            </div>
          )}

          {!generating && jobs.length === 0 && (
            <p className="empty-msg">No schedules generated yet.</p>
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