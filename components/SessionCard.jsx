"use client";

import { useState } from "react";
import Button from "./Button";
import { XIcon } from "./icons/index";
import "./SessionCard.css";

const TYPE_CONFIG = {
  Lecture:  { bgClass: "badge-lecture",  label: "Lecture"  },
  Tutorial: { bgClass: "badge-tutorial", label: "Tutorial" },
  Lab:      { bgClass: "badge-lab",      label: "Lab"      },
};

function calcDuration(start, end) {
  const toMins = (t) => {
    if (!t) return 0;
    const [time, period] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const diff = toMins(end) - toMins(start);
  if (diff <= 0) return "—";
  const hrs  = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

/**
 * SessionCard Component
 *
 * Displays a single schedule session as a clickable card.
 * Clicking expands it into a full overlay with course details.
 *
 * @component
 * @example
 * <SessionCard session={session} index={0} />
 */
export default function SessionCard({ session, index }) {
  const [expanded, setExpanded] = useState(false);
  const config   = TYPE_CONFIG[session.type] ?? TYPE_CONFIG["Lecture"];
  const duration = calcDuration(session.time, session.end);

  return (
    <>
      {/* ── Collapsed card ── */}
      <div
        className="session-card"
        style={{ animationDelay: `${index * 80}ms` }}
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setExpanded(true)}
      >
        <div className="session-card__time">{session.time} – {session.end}</div>
        <div className="session-card__main">
          <div className="session-card__header">
            <h3 className="session-card__title">{session.title}</h3>
            <span className={`session-badge ${config.bgClass}`}>{config.label}</span>
          </div>
          <div className="session-card__meta">
            <span className="session-card__meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {session.instructor}
            </span>
            <span className="session-card__meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {session.room}
            </span>
          </div>
        </div>
        <div className="session-card__chevron">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </div>

      {/* ── Expanded overlay ── */}
      {expanded && (
        <div className="session-overlay" onClick={() => setExpanded(false)}>
          <div className="session-overlay__card" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="session-overlay__header">
              <div>
                <div className="session-overlay__time">{session.time} – {session.end}</div>
                <h2 className="session-overlay__title">{session.title}</h2>
                <div className="session-overlay__badges">
                  <span className={`session-badge ${config.bgClass}`}>{config.label}</span>
                  <span className="session-code-badge">{session.code}</span>
                </div>
              </div>
              {/* Uses existing Button + XIcon from components/ */}
              <Button
                variant="ghost"
                size="sm"
                icon={<XIcon size={16} />}
                onClick={() => setExpanded(false)}
                className="session-overlay__close-btn"
                aria-label="Close"
              />
            </div>

            <div className="session-overlay__divider" />

            {/* Meta */}
            <div className="session-overlay__meta">
              <div className="session-overlay__meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>{session.instructor}</span>
              </div>
              <div className="session-overlay__meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>{session.room}</span>
              </div>
            </div>

            {/* About */}
            {session.about && (
              <p className="session-overlay__about">{session.about}</p>
            )}

            {/* Stats */}
            <div className="session-overlay__stats">
              {[
                { label: "Credits",  value: session.credits || "—" },
                { label: "Enrolled", value: session.enrolled       },
                { label: "Duration", value: duration               },
                { label: "Status",   value: "Active"               },
              ].map(({ label, value }) => (
                <div key={label} className="session-overlay__stat">
                  <span className="session-overlay__stat-value">{value}</span>
                  <span className="session-overlay__stat-label">{label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
