"use client";

import React from "react";
import "./Tag.css";

export default function Tag({
  label,
  variant = "default",
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
    <div className={`tag tag-${variantClass} ${disabled ? "is-disabled" : ""}`}>
      <span className="tag-label">{label}</span>
      {onRemove && (
        <button
          className="tag-remove-btn"
          onClick={handleRemove}
          disabled={disabled}
          type="button"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
