"use client";

import React, { useId } from "react";
import "./RadioGroup.css";

export default function RadioGroup({
  name,
  legend,
  options = [],
  value,
  onChange,
}) {
  const generatedName = useId();
  const groupName = name || `radio-group-${generatedName}`;

  return (
    <fieldset className="radio-group-root">
      {legend && <legend className="radio-group-legend">{legend}</legend>}

      <div className="radio-group-options">
        {options.map((option) => {
          const checked = value === option.value;

          return (
            <label
              key={option.value}
              className={`radio-option ${option.disabled ? "is-disabled" : ""}`}
            >
              <input
                type="radio"
                className="radio-input"
                name={groupName}
                value={option.value}
                checked={checked}
                onChange={() => onChange?.(option.value)}
                disabled={option.disabled}
              />
              <span className="radio-control" aria-hidden="true" />
              <span className="radio-label">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}