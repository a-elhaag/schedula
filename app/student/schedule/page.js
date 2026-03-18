"use client";

import { useState, useEffect } from "react";
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

// ── Replace with real logged-in user ID once auth is wired ───────────────────
const CURRENT_USER_ID = "69b6f7d2b3f8bb28379d5e68";

const DEFAULT_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];

// ── PDF Generator ─────────────────────────────────────────────────────────────
function generatePDF(student, sessions, days) {
  const allSessions = Object.values(sessions).flat();
  const totalCredits = allSessions
    .filter((s) => s.credits > 0)
    .reduce((a, s) => a + s.credits, 0);
  const totalCourses = new Set(allSessions.map((s) => s.code)).size;

  const sessionRows = days
    .map((day) => {
      const ds = sessions[day] || [];
      if (!ds.length) return "";
      return `
      <tr class="day-header-row"><td colspan="7" class="day-header">${day}</td></tr>
      ${ds
        .map(
          (s) => `
        <tr>
          <td class="td-time">${s.time} – ${s.end}</td>
          <td class="td-course">${s.title}</td>
          <td class="td-code">${s.code}</td>
          <td class="td-type"><span class="type-badge">${s.type}</span></td>
          <td class="td-meta">${s.instructor}</td>
          <td class="td-meta">${s.room}</td>
          <td class="td-credits">${s.credits || "—"}</td>
        </tr>
      `,
        )
        .join("")}
    `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="UTF-8"/>
  <title>Schedula — ${student.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"DM Sans",sans-serif;background:#fff;color:#1D1D1F;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header{background:#0071E3;padding:36px 40px 32px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
    .header-eyebrow{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:8px}
    .header-name{font-family:"DM Serif Display",serif;font-size:34px;color:#fff;line-height:1.15;margin-bottom:4px}
    .header-sub{font-size:13px;color:rgba(255,255,255,.7)}
    .header-card{background:rgba(255,255,255,.14);border-radius:16px;padding:16px 20px;min-width:200px}
    .header-card-row{font-size:12px;color:rgba(255,255,255,.85);margin-bottom:5px}
    .header-card-row:last-child{margin-bottom:0}
    .header-card-label{font-weight:700;color:rgba(255,255,255,.55);margin-right:6px}
    .stats{display:flex;gap:14px;padding:24px 40px;background:#F5F5F7}
    .stat{flex:1;background:#fff;border-radius:20px;padding:16px 14px;text-align:center}
    .stat-icon{font-size:20px;margin-bottom:6px}
    .stat-value{font-size:22px;font-weight:800;color:#0071E3;line-height:1;margin-bottom:4px}
    .stat-label{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6E6E73}
    .table-section{padding:24px 40px}
    .table-title{font-family:"DM Serif Display",serif;font-size:20px;color:#1D1D1F;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;border:1px solid #E8E8ED;border-radius:14px;overflow:hidden}
    thead tr{background:#F5F5F7}
    th{padding:11px 13px;text-align:left;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6E6E73;border-bottom:1px solid #E8E8ED}
    .day-header-row td{padding:10px 13px 5px;background:#F5F5F7}
    .day-header{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0071E3;border-bottom:1px solid #E8E8ED}
    .td-time{padding:10px 13px;font-size:12px;font-weight:700;color:#1D1D1F;border-bottom:1px solid #E8E8ED;white-space:nowrap}
    .td-course{padding:10px 13px;font-size:13px;font-weight:600;color:#1D1D1F;border-bottom:1px solid #E8E8ED}
    .td-code{padding:10px 13px;font-size:11px;color:#6E6E73;font-family:monospace;border-bottom:1px solid #E8E8ED}
    .td-type{padding:10px 13px;border-bottom:1px solid #E8E8ED}
    .td-meta{padding:10px 13px;font-size:12px;color:#6E6E73;border-bottom:1px solid #E8E8ED}
    .td-credits{padding:10px 13px;font-size:13px;font-weight:700;color:#0071E3;text-align:center;border-bottom:1px solid #E8E8ED}
    .type-badge{background:rgba(0,113,227,.1);color:#0071E3;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
    .footer{display:flex;justify-content:space-between;padding:16px 40px;background:#F5F5F7;margin-top:4px}
    .footer-left,.footer-right{font-size:11px;color:#6E6E73}
    .footer strong{color:#0071E3}
    .print-btn-wrap{text-align:center;padding:28px}
    .print-btn{background:#0071E3;color:#fff;border:none;padding:13px 36px;border-radius:9999px;font-size:15px;font-weight:700;cursor:pointer;font-family:"DM Sans",sans-serif}
    @page{margin:18mm 15mm;size:A4}
    @media print{.print-btn-wrap{display:none}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-eyebrow">Schedula · Official Timetable</div>
      <div class="header-name">${student.name}</div>
      <div class="header-sub">${student.semester} · ${student.level}</div>
    </div>
    <div class="header-card">
      <div class="header-card-row"><span class="header-card-label">ID</span>${student.id}</div>
      <div class="header-card-row"><span class="header-card-label">Faculty</span>${student.faculty}</div>
      <div class="header-card-row"><span class="header-card-label">Major</span>${student.major}</div>
      <div class="header-card-row"><span class="header-card-label">Level</span>${student.level}</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-icon">📚</div><div class="stat-value">${totalCourses}</div><div class="stat-label">Courses</div></div>
    <div class="stat"><div class="stat-icon">⚡</div><div class="stat-value">${allSessions.length}</div><div class="stat-label">Sessions</div></div>
    <div class="stat"><div class="stat-icon">🎓</div><div class="stat-value">${totalCredits}</div><div class="stat-label">Credits</div></div>
    <div class="stat"><div class="stat-icon">📅</div><div class="stat-value">${student.semester}</div><div class="stat-label">Semester</div></div>
  </div>
  <div class="table-section">
    <div class="table-title">Weekly Schedule</div>
    <table>
      <thead><tr><th>Time</th><th>Course</th><th>Code</th><th>Type</th><th>Instructor</th><th>Room</th><th style="text-align:center">Cr.</th></tr></thead>
      <tbody>${sessionRows}</tbody>
    </table>
  </div>
  <div class="footer">
    <div class="footer-left">Generated by <strong>Schedula</strong> · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
    <div class="footer-right">Total Credits: <strong>${totalCredits}</strong></div>
  </div>
  <div class="print-btn-wrap">
    <button class="print-btn" onclick="window.print()">🖨️ Save as PDF</button>
  </div>
</body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 400);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentSchedulePage() {
  const [activeDay, setActiveDay] = useState("Sunday");
  const [downloading, setDownloading] = useState(false);
  const [student, setStudent] = useState(null);
  const [sessions, setSessions] = useState({});
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPublished, setIsPublished] = useState(false);

  async function fetchSchedule() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/student/schedule?userId=${CURRENT_USER_ID}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load schedule");

      setStudent(data.student);
      setSessions(data.sessions ?? {});
      setIsPublished(data.isPublished ?? false);

      if (data.workingDays?.length) {
        setDays(data.workingDays);
        const firstWithSessions = data.workingDays.find(
          (d) => (data.sessions?.[d] ?? []).length > 0,
        );
        if (firstWithSessions) setActiveDay(firstWithSessions);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSchedule();
  }, []);

  const daySessions = sessions[activeDay] || [];
  const allSessions = Object.values(sessions).flat();
  const totalCredits = allSessions
    .filter((s) => s.credits > 0)
    .reduce((a, s) => a + s.credits, 0);
  const totalCourses = new Set(allSessions.map((s) => s.code)).size;

  function handleDownload() {
    if (!student) return;
    setDownloading(true);
    setTimeout(() => {
      generatePDF(student, sessions, days);
      setDownloading(false);
    }, 400);
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
