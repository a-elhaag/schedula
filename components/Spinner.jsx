"use client";

import React from "react";
import "./Spinner.css";

export default function Spinner({ size = "md" }) {
  const validSizes = ["sm", "md", "lg"];
  const sizeClass = validSizes.includes(size) ? size : "md";

  return (
    <div className={`spinner spinner-${sizeClass}`} role="status" aria-label="Loading">
      <svg className="spinner-svg" viewBox="0 0 50 50">
        <circle className="spinner-circle" cx="25" cy="25" r="20" />
      </svg>
    </div>
  );
}
