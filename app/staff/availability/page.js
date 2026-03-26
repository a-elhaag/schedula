"use client";

import { useState, useEffect } from "react";
import "./styles.css";

// ── Components from components/ folder ───────────────────────────────────────
import Button                from "../../../components/Button";
import ErrorState            from "../../../components/ErrorState";
import Skeleton              from "../../../components/Skeleton";
import WeeklyAvailabilityGrid, { slotKey } from "../../../components/WeeklyAvailabilityGrid";
import ConfirmStep           from "../../../components/ConfirmStep";
import SubmitSuccess         from "../../../components/SubmitSuccess";


// ── Slot config (shared with WeeklyAvailabilityGrid) ─────────────────────────
const SLOTS       = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const SLOT_LABELS = ["7AM","8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM"];

function slotLabel(slot) {
  return SLOT_LABELS[SLOTS.indexOf(slot)] ?? slot;
}

function groupSummary(selected) {
  const DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
  const grouped = {};
  DAYS.forEach(day => {
    const slots = SLOTS.filter(s => selected.has(slotKey(day, s)));
    if (slots.length) grouped[day] = slots;
  });
  return grouped;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfessorAvailabilityPage() {
  const [step,       setStep]       = useState("select"); // select | confirm | done
  const [selected,   setSelected]   = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [staff,      setStaff]      = useState(null);

  // ── Load existing availability on mount ───────────────────────────────────
  useEffect(() => {
    async function loadAvailability() {
      try {
        const res = await fetch(`/api/staff/availability`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");

        setStaff(data.staff);

        // Restore previously saved slots into the grid
        if (data.slots?.length) {
          const restored = new Set(
            data.slots.map(({ day, slot }) => slotKey(day, slot))
          );
          setSelected(restored);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAvailability();
  }, []);

  // ── Submit to MongoDB via API route ───────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    try {
      const slots = [...selected].map(k => {
        const [day, slot] = k.split("__");
        return { day, slot };
      });

      const res = await fetch("/api/staff/availability", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");

      setStep("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const summary = groupSummary(selected);

  // ── Loading & error use imported components ───────────────────────────────
  if (loading) return <div className="avail-page"><Skeleton /></div>;
  if (error)   return <div className="avail-page"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>;

  return (
    <div className="avail-page">

      {/* Header */}
      <section className="avail-header">
        <div className="avail-header__left">
          <div className="avail-header__eyebrow">Spring 2026 | Availability Submission</div>
          <h1 className="avail-header__title">Set Your Availability</h1>
          <p className="avail-header__subtitle">
            {staff?.name ?? "Staff Member"} | {staff?.role ?? "Professor"} |{" "}
            Select all time slots you are available to teach this semester.
          </p>
        </div>

        {/* Step indicator */}
        <div className="avail-steps">
          {[
            { id: "select",  label: "Select Slots" },
            { id: "confirm", label: "Review"        },
            { id: "done",    label: "Submitted"     },
          ].map((s, i, arr) => {
            const stepOrder  = ["select","confirm","done"];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx    = stepOrder.indexOf(s.id);
            const isDone     = thisIdx < currentIdx;
            const isActive   = thisIdx === currentIdx;
            return (
              <div key={s.id} className="avail-step">
                <div className={`avail-step__circle ${isDone ? "avail-step__circle--done" : ""} ${isActive ? "avail-step__circle--active" : ""}`}>
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`avail-step__label ${isActive ? "avail-step__label--active" : ""}`}>
                  {s.label}
                </span>
                {i < arr.length - 1 && (
                  <div className={`avail-step__line ${isDone ? "avail-step__line--done" : ""}`} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Content - each step uses its own imported component */}
      <div className="avail-content">

        {step === "select" && (
          <>
            {/* WeeklyAvailabilityGrid from components/ */}
            <WeeklyAvailabilityGrid selected={selected} onChange={setSelected} />
            <div className="avail-content__actions">
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                Clear All
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep("confirm")}
                disabled={selected.size === 0}
              >
                Review &amp; Submit
              </Button>
            </div>
          </>
        )}

        {step === "confirm" && (
          /* ConfirmStep from components/ */
          <ConfirmStep
            summary={summary}
            slotLabel={slotLabel}
            onBack={() => setStep("select")}
            onConfirm={handleSubmit}
            submitting={submitting}
          />
        )}

        {step === "done" && (
          /* SubmitSuccess from components/ */
          <SubmitSuccess
            summary={summary}
            slotLabel={slotLabel}
            onEdit={() => setStep("select")}
          />
        )}

      </div>
    </div>
  );
}