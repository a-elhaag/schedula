"use client";

import React, { useId } from "react";
import "./Switch.css";

export default function Switch({
  id,
  name,
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
}) {
  const generatedId = useId();
  const inputId = id || `switch-${generatedId}`;

  return (
    <label className={`switch-root ${disabled ? "is-disabled" : ""}`} htmlFor={inputId}>
      <input
        id={inputId}
        name={name}
        type="checkbox"
        className="switch-input"
        role="switch"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={(event) => onChange?.(event.target.checked)}
        disabled={disabled}
      />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
}