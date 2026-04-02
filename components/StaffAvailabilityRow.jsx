"use client";

import { useState } from "react";
import Badge from "./Badge";
import "./StaffAvailabilityRow.css";

/**
 * StaffAvailabilityRow Component
 *
 * Expandable row showing a staff member's availability submission status.
 * Click to expand and see submitted time slots grouped by day.
 * Used in coordinator availability status page.
 *
 * @component
 * @example
 * <StaffAvailabilityRow member={member} />
 */
export default function StaffAvailabilityRow({ member }) {
  const [expanded, setExpanded] = useState(false);

  const statusVariant = {
    submitted: "success",
    pending:   "warning",
    missing:   "danger",
  }[member.status] ?? "default";

  const initials = member.name
    .split(" ")
    .slice(0, 2)
    .map(n => n[0])
    .join("")
    .toUpperCase();

  const DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];

  return (
    <div className="avail-row">
      <div
        className="avail-row__main"
        onClick={() => setExpanded(p => !p)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setExpanded(p => !p)}
      >
        <div className="avail-row__avatar">{initials}</div>
        <div className="avail-row__info">
          <p className="avail-row__name">{member.name}</p>
          <p className="avail-row__role">
            {member.role === "ta" ? "Teaching Assistant" : "Professor"}
          </p>
        </div>
        <div className="avail-row__slots">
          {member.status === "submitted" ? (
            <span className="avail-row__slot-count">{member.slotCount} slots</span>
          ) : (
            <span className="avail-row__slot-count avail-row__slot-count--none">
              No submission
            </span>
          )}
        </div>
        <Badge variant={statusVariant} size="sm">
          {member.status === "submitted" ? "Submitted"
            : member.status === "pending" ? "Pending"
            : "Missing"}
        </Badge>
        <button className="avail-row__toggle" aria-label="Toggle details">
          {expanded ? "-" : "+"}
        </button>
      </div>

      {expanded && member.status === "submitted" && member.slots?.length > 0 && (
        <div className="avail-row__details">
          {DAYS.map(day => {
            const daySlots = member.slots.filter(s => s.day === day);
            if (!daySlots.length) return null;
            return (
              <div key={day} className="avail-row__day">
                <span className="avail-row__day-label">{day.slice(0, 3)}</span>
                <div className="avail-row__day-slots">
                  {daySlots.map((s, i) => (
                    <span key={i} className="avail-slot-badge">{s.slot}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
