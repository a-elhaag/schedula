"use client";

import React, { useId } from "react";
import "./ConstraintWeightSlider.css";

export default function ConstraintWeightSlider({
  id,
  label = "Constraint Weight",
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  description = "Controls how strongly the solver penalizes this soft constraint.",
  disabled = false,
}) {
  const generatedId = useId();
  const sliderId = id || `constraint-weight-${generatedId}`;
  const clampedValue = Math.max(min, Math.min(max, value));
  const ratio = ((clampedValue - min) / (max - min || 1)) * 100;

  return (
    <div className={`constraint-slider-root ${disabled ? "is-disabled" : ""}`}>
      <div className="constraint-slider-head">
        <label htmlFor={sliderId} className="constraint-slider-label">
          {label}
        </label>
        <span className="constraint-slider-value">{clampedValue}%</span>
      </div>

      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedValue}
        onChange={(event) => onChange?.(Number(event.target.value))}
        className="constraint-slider-input"
        style={{ "--slider-progress": `${ratio}%` }}
        disabled={disabled}
      />

      <p className="constraint-slider-description">{description}</p>
    </div>
  );
}