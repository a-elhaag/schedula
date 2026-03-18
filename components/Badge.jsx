"use client";

import React from "react";
import "./Badge.css";

export default function Badge({
  variant = "default",
  children,
  size = "md",
  icon,
  onRemove,
  disabled = false,
}) {
  const validVariants = ["default", "info", "success", "warning", "danger"];
  const variantClass = validVariants.includes(variant) ? variant : "default";

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && onRemove) {
      onRemove();
    }
  };

  return (
    <span
      className={`badge badge-${variantClass} badge-${size} ${disabled ? "is-disabled" : ""}`}
    >
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-content">{children}</span>
      {onRemove && (
        <button
          className="badge-remove-btn"
          onClick={handleRemove}
          disabled={disabled}
          type="button"
          aria-label="Remove badge"
        >
          ×
        </button>
      )}
    </span>
  );
}
