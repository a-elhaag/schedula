import React from "react";
import "./Input.css";

/**
 * Standard Input component following the Schedula Design Spec.
 * Uses 16-20px border radius, 1.5px border, and accent ring on focus.
 */
export function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  className = "",
  ...props
}) {
  return (
    <div className={`input-container ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="input-field"
        {...props}
      />
    </div>
  );
}
