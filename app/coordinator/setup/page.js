"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import Button     from "@/components/Button";
import Toast      from "@/components/Toast";
import Spinner    from "@/components/Spinner";
import ErrorState from "@/components/ErrorState";
import { Input }  from "@/components/Input";
import { BoltIcon, CalendarIcon, HomeIcon, UserIcon } from "@/components/icons/index";

const STEPS = [
  { id: "institution", label: "Institution",  icon: HomeIcon     },
  { id: "term",        label: "Term",         icon: CalendarIcon },
  { id: "schedule",    label: "Schedule",     icon: BoltIcon     },
  { id: "review",      label: "Review",       icon: UserIcon     },
];

const WORKING_DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"];

// ── StepIndicator ─────────────────────────────────────────────────────────────
function StepIndicator({ steps, currentStep }) {
  return (
    <div className="avail-steps setup-steps">
      {steps.map((s, i) => {
        const order   = steps.findIndex(x => x.id === currentStep);
        const isDone  = i < order;
        const isActive = i === order;
        const Icon    = s.icon;
        return (
          <div key={s.id} className="avail-step">
            <div className={`avail-step__circle ${isDone ? "avail-step__circle--done" : ""} ${isActive ? "avail-step__circle--active" : ""}`}>
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <Icon size={14} />
              )}
            </div>
            <span className={`avail-step__label ${isActive ? "avail-step__label--active" : ""}`}>{s.label}</span>
            {i < steps.length - 1 && <div className={`avail-step__line ${isDone ? "avail-step__line--done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoordinatorSetupPage() {
  const [step,    setStep]    = useState("institution");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [done,    setDone]    = useState(false);
  const [toast,   setToast]   = useState({ open:false, variant:"info", title:"", message:"", id:0 });

  const [form, setForm] = useState({
    institutionName: "",
    slug:            "",
    termLabel:       "Spring 2026",
    termStart:       "2026-02-01",
    termEnd:         "2026-06-30",
    workingDays:     ["Saturday","Sunday","Monday","Tuesday","Wednesday"],
    dailyStart:      "08:00",
    dailyEnd:        "17:00",
    slotDuration:    "60",
    maxConsecutive:  "4",
  });

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/coordinator/setup");
      const json = await res.json();
      if (res.ok && json.institution) {
        const inst = json.institution;
        setForm(p => ({
          ...p,
          institutionName: inst.name ?? "",
          slug:            inst.slug ?? "",
          termLabel:       inst.active_term?.label      ?? p.termLabel,
          termStart:       inst.active_term?.start_date ?? p.termStart,
          termEnd:         inst.active_term?.end_date   ?? p.termEnd,
          workingDays:     inst.active_term?.working_days ?? p.workingDays,
          dailyStart:      inst.settings?.daily_start   ?? p.dailyStart,
          dailyEnd:        inst.settings?.daily_end     ?? p.dailyEnd,
          slotDuration:    String(inst.settings?.slot_duration_minutes ?? 60),
          maxConsecutive:  String(inst.settings?.max_consecutive_slots ?? 4),
        }));
        if (json.isComplete) setDone(true);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleDay(day) {
    setForm(p => ({
      ...p,
      workingDays: p.workingDays.includes(day)
        ? p.workingDays.filter(d => d !== day)
        : [...p.workingDays, day],
    }));
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const res  = await fetch("/api/coordinator/setup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      setDone(true);
      showToast("success", "Setup Complete", "Your institution is configured and ready.");
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="courses-page"><div className="review-loading"><Spinner size="lg" /></div></div>;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  if (done) return (
    <div className="courses-page">
      <main className="courses-shell">
        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Setup Complete</h1>
          <p className="hero-subtitle">Your institution is configured for {form.termLabel}.</p>
        </section>
        <div className="panel reveal reveal-2" style={{ textAlign:"center", padding:"48px" }}>
          <div style={{ marginBottom:20 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 style={{ fontFamily:"DM Serif Display,serif", fontSize:28, marginBottom:8 }}>Institution Ready</h2>
          <p style={{ color:"var(--color-text-muted)", marginBottom:24 }}>
            {form.institutionName} is set up for {form.termLabel}.
            Working days: {form.workingDays.join(", ")}.
          </p>
          <Button variant="primary" onClick={() => setDone(false)}>Edit Setup</Button>
        </div>
      </main>
    </div>
  );

  return (
    <div className="courses-page">
      <main className="courses-shell">

        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Institution Setup</h1>
          <p className="hero-subtitle">
            Configure your institution, active term, and scheduling parameters
            before generating timetables.
          </p>
        </section>

        <StepIndicator steps={STEPS} currentStep={step} />

        {/* Step: Institution */}
        {step === "institution" && (
          <div className="panel reveal reveal-2">
            <h2>Institution Details</h2>
            <p style={{ color:"var(--color-text-muted)", marginBottom:24 }}>Basic information about your institution.</p>
            <div className="form-grid">
              <Input label="Institution Name" value={form.institutionName} onChange={e => setForm(p => ({ ...p, institutionName: e.target.value }))} placeholder="e.g. Faculty of Engineering" />
              <Input label="Slug / Short ID"  value={form.slug}            onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}            placeholder="e.g. eng-faculty"         />
            </div>
            <div className="confirm-actions" style={{ marginTop:24 }}>
              <Button variant="primary" onClick={() => setStep("term")} disabled={!form.institutionName.trim()}>
                Next: Term Setup
              </Button>
            </div>
          </div>
        )}

        {/* Step: Term */}
        {step === "term" && (
          <div className="panel reveal reveal-2">
            <h2>Active Term</h2>
            <p style={{ color:"var(--color-text-muted)", marginBottom:24 }}>Define the current academic term.</p>
            <div className="form-grid">
              <Input label="Term Label" value={form.termLabel} onChange={e => setForm(p => ({ ...p, termLabel: e.target.value }))} placeholder="e.g. Spring 2026" />
              <Input label="Start Date" value={form.termStart} onChange={e => setForm(p => ({ ...p, termStart: e.target.value }))} type="date" />
              <Input label="End Date"   value={form.termEnd}   onChange={e => setForm(p => ({ ...p, termEnd:   e.target.value }))} type="date" />
            </div>
            <div style={{ marginTop:20 }}>
              <p className="form-label">Working Days</p>
              <div className="role-options" style={{ flexWrap:"wrap" }}>
                {WORKING_DAYS.map(day => (
                  <label
                    key={day}
                    className={`role-option ${form.workingDays.includes(day) ? "role-option--active" : ""}`}
                    style={{ minWidth:80 }}
                  >
                    <input type="checkbox" checked={form.workingDays.includes(day)} onChange={() => toggleDay(day)} />
                    {day.slice(0,3)}
                  </label>
                ))}
              </div>
            </div>
            <div className="confirm-actions" style={{ marginTop:24 }}>
              <Button variant="ghost" onClick={() => setStep("institution")}>Back</Button>
              <Button variant="primary" onClick={() => setStep("schedule")}>Next: Schedule Settings</Button>
            </div>
          </div>
        )}

        {/* Step: Schedule settings */}
        {step === "schedule" && (
          <div className="panel reveal reveal-2">
            <h2>Schedule Settings</h2>
            <p style={{ color:"var(--color-text-muted)", marginBottom:24 }}>Configure daily time bounds and slot parameters.</p>
            <div className="form-grid">
              <Input label="Daily Start Time"   value={form.dailyStart}    onChange={e => setForm(p => ({ ...p, dailyStart:    e.target.value }))} type="time" />
              <Input label="Daily End Time"     value={form.dailyEnd}      onChange={e => setForm(p => ({ ...p, dailyEnd:      e.target.value }))} type="time" />
              <Input label="Slot Duration (min)"value={form.slotDuration}  onChange={e => setForm(p => ({ ...p, slotDuration:  e.target.value }))} type="number" placeholder="60"  />
              <Input label="Max Consecutive"    value={form.maxConsecutive}onChange={e => setForm(p => ({ ...p, maxConsecutive:e.target.value }))} type="number" placeholder="4"   />
            </div>
            <div className="confirm-actions" style={{ marginTop:24 }}>
              <Button variant="ghost" onClick={() => setStep("term")}>Back</Button>
              <Button variant="primary" onClick={() => setStep("review")}>Next: Review</Button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="panel reveal reveal-2">
            <h2>Review Configuration</h2>
            <p style={{ color:"var(--color-text-muted)", marginBottom:24 }}>Check everything before saving.</p>
            <div className="approve-summary">
              {[
                { label:"Institution",    value: form.institutionName                },
                { label:"Term",           value: form.termLabel                      },
                { label:"Dates",          value: `${form.termStart} to ${form.termEnd}` },
                { label:"Working Days",   value: form.workingDays.join(", ")         },
                { label:"Daily Hours",    value: `${form.dailyStart} - ${form.dailyEnd}` },
                { label:"Slot Duration",  value: `${form.slotDuration} minutes`      },
                { label:"Max Consecutive",value: form.maxConsecutive                 },
              ].map(({ label, value }) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--color-border)" }}>
                  <span style={{ fontWeight:700, fontSize:13, color:"var(--color-text-muted)" }}>{label}</span>
                  <span style={{ fontSize:13, color:"var(--color-text-primary)" }}>{value}</span>
                </div>
              ))}
            </div>
            <div className="confirm-actions" style={{ marginTop:24 }}>
              <Button variant="ghost" onClick={() => setStep("schedule")}>Back</Button>
              <Button variant="primary" onClick={handleFinish} disabled={saving}>
                {saving ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}

      </main>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}
