"use client";

import React, { useId } from "react";
import "./Checkbox.css";

export default function Checkbox({
  id,
  name,
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
}) {
  const generatedId = useId();
  const inputId = id || `checkbox-${generatedId}`;

  return (
    <label className={`checkbox-root ${disabled ? "is-disabled" : ""}`} htmlFor={inputId}>
      <input
        id={inputId}
        name={name}
        type="checkbox"
        className="checkbox-input"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={(event) => onChange?.(event.target.checked)}
        disabled={disabled}
      />
      <span className="checkbox-control" aria-hidden="true" />
      {label && <span className="checkbox-label">{label}</span>}
    </label>
  );
}