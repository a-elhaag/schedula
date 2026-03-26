"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import Button             from "@/components/Button";
import { StatCard }       from "@/components/StatCard";
import Toast              from "@/components/Toast";
import Spinner            from "@/components/Spinner";
import ErrorState         from "@/components/ErrorState";
import HardConstraintRow  from "@/components/HardConstraintRow";
import SoftConstraintRow  from "@/components/SoftConstraintRow";
import { WarningIcon, BoltIcon } from "@/components/icons/index";

const HARD_CONSTRAINTS = [
  { key: "no_room_overlap",      label: "No Room Double-Booking",      description: "A room cannot have two sessions at the same time."               },
  { key: "no_staff_overlap",     label: "No Staff Double-Booking",     description: "A staff member cannot teach two sessions at the same time."      },
  { key: "respect_availability", label: "Respect Staff Availability",  description: "Sessions only scheduled when staff is available."               },
  { key: "room_capacity",        label: "Room Capacity Respected",     description: "Enrolled students must not exceed room capacity."               },
  { key: "working_days_only",    label: "Working Days Only",           description: "Sessions only scheduled on institution working days."           },
];

const SOFT_CONSTRAINTS = [
  { key: "minimize_gaps",    label: "Minimize Staff Gaps",       description: "Prefer schedules with fewer idle gaps between sessions."      },
  { key: "balance_workload", label: "Balance Staff Workload",    description: "Distribute sessions evenly across staff members."             },
  { key: "prefer_morning",   label: "Prefer Morning Sessions",   description: "Schedule sessions earlier in the day when possible."         },
  { key: "group_by_course",  label: "Group Course Sessions",     description: "Keep multiple sessions of the same course on the same days." },
  { key: "room_utilization", label: "Maximize Room Utilization", description: "Prefer rooms that best match enrollment size."               },
];

export default function CoordinatorConstraintsPage() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState({ open:false, variant:"info", title:"", message:"", id:0 });

  const [hard, setHard] = useState(
    Object.fromEntries(HARD_CONSTRAINTS.map(c => [c.key, true]))
  );
  const [soft, setSoft] = useState(
    Object.fromEntries(SOFT_CONSTRAINTS.map(c => [c.key, 50]))
  );

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/coordinator/constraints");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      if (json.hard) setHard(json.hard);
      if (json.soft) setSoft(json.soft);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const res  = await fetch("/api/coordinator/constraints", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ hard, soft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      showToast("success", "Constraints Saved", "Your scheduling rules have been saved.");
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setSaving(false); }
  }

  function resetDefaults() {
    setHard(Object.fromEntries(HARD_CONSTRAINTS.map(c => [c.key, true])));
    setSoft(Object.fromEntries(SOFT_CONSTRAINTS.map(c => [c.key, 50])));
    showToast("info", "Reset", "Constraints reset to defaults.");
  }

  if (loading) return <div className="courses-page"><div className="review-loading"><Spinner size="lg" /></div></div>;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  const hardEnabled = Object.values(hard).filter(Boolean).length;
  const avgWeight   = Math.round(Object.values(soft).reduce((a, v) => a + v, 0) / SOFT_CONSTRAINTS.length);

  return (
    <div className="courses-page">
      <main className="courses-shell">

        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Scheduling Constraints</h1>
          <p className="hero-subtitle">
            Define hard rules the solver must follow, and soft preferences it should
            optimize for when generating the timetable.
          </p>
        </section>

        <section className="stats-grid reveal reveal-2">
          <StatCard label="Hard Constraints" value={`${hardEnabled}/${HARD_CONSTRAINTS.length}`} trend="Must be satisfied"    trendUp={false} Icon={WarningIcon} />
          <StatCard label="Soft Constraints" value={String(SOFT_CONSTRAINTS.length)}              trend="Weighted preferences" trendUp Icon={BoltIcon}    />
          <StatCard label="Avg Soft Weight"  value={`${avgWeight}%`}                              trend="Optimization priority" trendUp Icon={BoltIcon}   />
        </section>

        {/* Hard constraints */}
        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Hard Constraints</h2>
              <p>These rules must be satisfied -- the solver will never violate them.</p>
            </div>
            <div className="constraint-hard-badge">
              <WarningIcon size={14} /> Must satisfy
            </div>
          </div>
          <div className="constraints-list">
            {/* HardConstraintRow from components/ */}
            {HARD_CONSTRAINTS.map(c => (
              <HardConstraintRow
                key={c.key}
                constraint={c}
                enabled={hard[c.key] ?? true}
                onChange={(key, val) => setHard(p => ({ ...p, [key]: val }))}
              />
            ))}
          </div>
        </section>

        {/* Soft constraints */}
        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Soft Constraints</h2>
              <p>The solver will try to optimize these. Higher weight means higher priority.</p>
            </div>
            <div className="constraint-soft-badge">
              Optimize when possible
            </div>
          </div>
          <div className="constraints-list">
            {/* SoftConstraintRow from components/ */}
            {SOFT_CONSTRAINTS.map(c => (
              <SoftConstraintRow
                key={c.key}
                constraint={c}
                weight={soft[c.key] ?? 50}
                onChange={(key, val) => setSoft(p => ({ ...p, [key]: val }))}
              />
            ))}
          </div>
        </section>

        <section className="quick-actions reveal reveal-4">
          <Button variant="ghost" onClick={resetDefaults}>Reset to Defaults</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Constraints"}
          </Button>
        </section>

      </main>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}