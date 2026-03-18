"use client";

import { useState, useEffect, useMemo } from "react";
import "./styles.css";

// ── Components from components/ folder ───────────────────────────────────────
import Button from "../../../components/Button";
import SessionCard from "../../../components/SessionCard";
import Skeleton from "../../../components/Skeleton";
import ErrorState from "../../../components/ErrorState";
import {
  DownloadIcon,
  WarningIcon,
  BookOpenIcon,
  BoltIcon,
  GraduationCapIcon,
  CalendarIcon,
  SunIcon,
} from "../../../components/icons/index";
import { useDataCache } from "../../../hooks/useDataCache";

// ── Replace with real logged-in user ID once auth is wired ───────────────────
const CURRENT_USER_ID = "69b6f7d2b3f8bb28379d5e68";

const DEFAULT_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentSchedulePage() {
  const [activeDay, setActiveDay] = useState("Sunday");
  const [downloading, setDownloading] = useState(false);

  const {
    data,
    isLoading: loading,
    error,
    refetch: fetchSchedule,
  } = useDataCache(
    "student_schedule",
    "schedule",
    `/api/student/schedule?userId=${CURRENT_USER_ID}`
  );

  const student = data?.student ?? null;
  const sessions = data?.sessions ?? {};
  const days = data?.workingDays?.length ? data.workingDays : DEFAULT_DAYS;
  const isPublished = data?.isPublished ?? false;

  // Set the active day to the first day that has sessions when data loads
  useEffect(() => {
    if (data?.workingDays?.length && data?.sessions) {
      const first = data.workingDays.find(
        (d) => (data.sessions[d] ?? []).length > 0
      );
      if (first) setActiveDay(first);
    }
  }, [data]);

  const daySessions = sessions[activeDay] || [];
  const { allSessions, totalCredits, totalCourses } = useMemo(() => {
    const all = Object.values(sessions).flat();
    return {
      allSessions: all,
      totalCredits: all.filter((s) => s.credits > 0).reduce((a, s) => a + s.credits, 0),
      totalCourses: new Set(all.map((s) => s.code)).size,
    };
  }, [sessions]);

  async function handleDownload() {
    if (!student) return;
    setDownloading(true);
    try {
      const { default: generatePDF } = await import("../../../lib/generatePDF");
      generatePDF(student, sessions, days);
    } finally {
      setDownloading(false);
    }
  }

  // Uses imported Skeleton and ErrorState components
  if (loading)
    return (
      <div className="student-schedule-page">
        <Skeleton />
      </div>
    );
  if (error)
    return (
      <div className="student-schedule-page">
        <ErrorState message={error} onRetry={fetchSchedule} />
      </div>
    );

  return (
    <div className="student-schedule-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-top-row">
          <div>
            <div className="hero-eyebrow">
              {student?.semester} · {student?.faculty}
            </div>
            <h1 className="hero-title">My Schedule</h1>
            <p className="hero-subtitle">
              {student?.name} · {student?.id} · {student?.major} ·{" "}
              {student?.level}
            </p>
          </div>
          <div className="hero-actions">
            {/* Uses existing Button + DownloadIcon from components/ */}
            <Button
              variant="primary"
              size="md"
              icon={<DownloadIcon size={15} />}
              onClick={handleDownload}
              disabled={downloading || !allSessions.length}
            >
              {downloading ? "Generating…" : "Download PDF"}
            </Button>
            {!isPublished && (
              <span className="draft-badge">
                <WarningIcon size={12} />
                Draft — not published yet
              </span>
            )}
          </div>
        </div>

        {/* Student info strip */}
        <div className="student-strip">
          {[
            { label: "Faculty", value: student?.faculty },
            { label: "Major", value: student?.major },
            { label: "Level", value: student?.level },
            { label: "Semester", value: student?.semester },
          ].map(({ label, value }) => (
            <div key={label} className="student-strip__item">
              <span className="student-strip__label">{label}</span>
              <span className="student-strip__value">{value ?? "—"}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="stats-row">
        {[
          {
            icon: <BookOpenIcon size={22} />,
            label: "Courses",
            value: totalCourses,
          },
          {
            icon: <BoltIcon size={22} />,
            label: "Sessions",
            value: allSessions.length,
          },
          {
            icon: <GraduationCapIcon size={22} />,
            label: "Credits",
            value: totalCredits,
          },
          {
            icon: <CalendarIcon size={22} />,
            label: "Semester",
            value: student?.semester,
          },
        ].map(({ icon, label, value }, i) => (
          <div
            key={label}
            className="stat-card"
            style={{ animationDelay: `${100 + i * 60}ms` }}
          >
            <div className="stat-card__icon">{icon}</div>
            <div className="stat-card__value">{value}</div>
            <div className="stat-card__label">{label}</div>
          </div>
        ))}
      </section>

      {/* Day tabs + sessions */}
      <section className="days-section">
        <div className="day-tabs">
          {days.map((day) => {
            const count = (sessions[day] || []).length;
            return (
              <button
                key={day}
                className={`day-tab ${activeDay === day ? "day-tab--active" : ""}`}
                onClick={() => setActiveDay(day)}
              >
                <span className="day-tab__name">{day.slice(0, 3)}</span>
                {count > 0 && (
                  <span
                    className={`day-tab__count ${activeDay === day ? "day-tab__count--active" : ""}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="sessions-container">
          {daySessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <SunIcon size={44} />
              </div>
              <h3 className="empty-state__title">No sessions on {activeDay}</h3>
              <p className="empty-state__subtitle">Enjoy your day off!</p>
            </div>
          ) : (
            <div className="sessions-list">
              {/* Uses imported SessionCard component */}
              {daySessions.map((session, i) => (
                <SessionCard key={session.id} session={session} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Week overview */}
      <section className="week-overview">
        <h2 className="week-overview__title">Week at a Glance</h2>
        <div
          className="week-grid"
          style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
        >
          {days.map((day) => {
            const daySess = sessions[day] || [];
            return (
              <div
                key={day}
                className={`week-day-card ${activeDay === day ? "week-day-card--active" : ""}`}
                onClick={() => setActiveDay(day)}
              >
                <div className="week-day-card__header">
                  <span className="week-day-card__name">{day.slice(0, 3)}</span>
                  <span className="week-day-card__count">{daySess.length}</span>
                </div>
                <div className="week-day-card__sessions">
                  {daySess.map((s) => (
                    <div
                      key={s.id}
                      className={`week-session-dot week-session-dot--${s.type.toLowerCase()}`}
                      title={s.title}
                    />
                  ))}
                  {daySess.length === 0 && (
                    <span className="week-day-card__free">Free</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
