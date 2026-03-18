"use client";

import React from "react";
import "./Badge.css";

export default function Badge({
  variant = "default",
  children,
  size = "md",
  icon,
}) {
  const validVariants = ["default", "info", "success", "warning", "danger"];
  const variantClass = validVariants.includes(variant) ? variant : "default";

  return (
    <span className={`badge badge-${variantClass} badge-${size}`}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-content">{children}</span>
    </span>
  );
}
