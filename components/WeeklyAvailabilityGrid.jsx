"use client";

import { useState, useEffect, useCallback } from "react";
import "./WeeklyAvailabilityGrid.css";

const DAYS  = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
const SLOTS = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const SLOT_LABELS = ["7AM","8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM"];

export function slotKey(day, slot) { return `${day}__${slot}`; }

/**
 * WeeklyAvailabilityGrid Component
 *
 * A click-and-drag weekly grid for staff to select available time slots.
 * Supports single click, drag selection, day-column toggle, and time-row toggle.
 *
 * @component
 * @example
 * <WeeklyAvailabilityGrid selected={selected} onChange={setSelected} />
 *
 * @param {Set} selected - Set of slotKey strings currently selected
 * @param {Function} onChange - Called with new Set when selection changes
 */
export default function WeeklyAvailabilityGrid({ selected, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // "add" | "remove"

  function applyCell(day, slot, mode) {
    const k = slotKey(day, slot);
    onChange(prev => {
      const next = new Set(prev);
      if (mode === "add") next.add(k); else next.delete(k);
      return next;
    });
  }

  function handleMouseDown(day, slot) {
    const k    = slotKey(day, slot);
    const mode = selected.has(k) ? "remove" : "add";
    setDragMode(mode);
    setDragging(true);
    applyCell(day, slot, mode);
  }

  function handleMouseEnter(day, slot) {
    if (dragging) applyCell(day, slot, dragMode);
  }

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    setDragMode(null);
  }, []);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  function selectAll() {
    onChange(new Set(DAYS.flatMap(d => SLOTS.map(s => slotKey(d, s)))));
  }

  function clearAll() {
    onChange(new Set());
  }

  function selectDay(day) {
    onChange(prev => {
      const next = new Set(prev);
      const allSelected = SLOTS.every(s => next.has(slotKey(day, s)));
      SLOTS.forEach(s =>
        allSelected ? next.delete(slotKey(day, s)) : next.add(slotKey(day, s))
      );
      return next;
    });
  }

  function selectSlot(slot) {
    onChange(prev => {
      const next = new Set(prev);
      const allSelected = DAYS.every(d => next.has(slotKey(d, slot)));
      DAYS.forEach(d =>
        allSelected ? next.delete(slotKey(d, slot)) : next.add(slotKey(d, slot))
      );
      return next;
    });
  }

  return (
    <div className="grid-wrapper" onMouseLeave={handleMouseUp}>

      {/* Legend + quick actions */}
      <div className="grid-legend">
        <div className="grid-legend__items">
          <span className="grid-legend__item">
            <span className="grid-legend__dot grid-legend__dot--selected" />
            Available
          </span>
          <span className="grid-legend__item">
            <span className="grid-legend__dot grid-legend__dot--empty" />
            Unavailable
          </span>
          <span className="grid-legend__item grid-legend__hint">
            Click or drag to select
          </span>
        </div>
        <div className="grid-legend__actions">
          <button className="grid-action-btn" onClick={selectAll}>Select All</button>
          <button className="grid-action-btn" onClick={clearAll}>Clear All</button>
        </div>
      </div>

      {/* Grid */}
      <div className="availability-grid" style={{ userSelect: "none" }}>

        {/* Corner placeholder */}
        <div className="grid-corner" />

        {/* Day headers */}
        {DAYS.map(day => (
          <div
            key={day}
            className="grid-day-header"
            onClick={() => selectDay(day)}
            title={`Toggle all ${day} slots`}
          >
            <span className="grid-day-header__name">{day.slice(0, 3)}</span>
            <span className="grid-day-header__count">
              {SLOTS.filter(s => selected.has(slotKey(day, s))).length}/{SLOTS.length}
            </span>
          </div>
        ))}

        {/* Rows - div with display:contents keeps grid layout while giving React a key */}
        {SLOTS.map((slot, si) => (
          <div key={slot} style={{ display: "contents" }}>

            {/* Time label */}
            <div
              className="grid-time-label"
              onClick={() => selectSlot(slot)}
              title={`Toggle ${SLOT_LABELS[si]} for all days`}
            >
              {SLOT_LABELS[si]}
            </div>

            {/* Cells */}
            {DAYS.map(day => {
              const k   = slotKey(day, slot);
              const sel = selected.has(k);
              return (
                <div
                  key={k}
                  className={`grid-cell ${sel ? "grid-cell--selected" : ""}`}
                  onMouseDown={() => handleMouseDown(day, slot)}
                  onMouseEnter={() => handleMouseEnter(day, slot)}
                >
                  {sel && <span className="grid-cell__check" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer count */}
      <div className="grid-footer">
        <span className="grid-footer__count">
          <strong>{selected.size}</strong> slot{selected.size !== 1 ? "s" : ""} selected
        </span>
        <span className="grid-footer__hours">
          approx. <strong>{selected.size}</strong> hour{selected.size !== 1 ? "s" : ""} available per week
        </span>
      </div>
    </div>
  );
}
