"use client";

import React from "react";
import "./Skeleton.css";

export default function Skeleton({ type = "line", width = "100%", height }) {
  const validTypes = ["line", "block", "card"];
  const skeletonType = validTypes.includes(type) ? type : "line";

  const baseStyle = {
    width,
  };

  // Set height based on type if not provided
  if (!height) {
    switch (skeletonType) {
      case "line":
        baseStyle.height = "16px";
        break;
      case "block":
        baseStyle.height = "120px";
        break;
      case "card":
        baseStyle.height = "240px";
        break;
      default:
        baseStyle.height = "16px";
    }
  } else {
    baseStyle.height = height;
  }

  if (skeletonType === "card") {
    return (
      <div className="skeleton skeleton-card" style={{ width }}>
        <div className="skeleton-card-header" />
        <div className="skeleton-card-content">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" style={{ width: "85%" }} />
          <div className="skeleton skeleton-line" style={{ width: "70%" }} />
        </div>
        <div className="skeleton-card-footer" />
      </div>
    );
  }

  return (
    <div className={`skeleton skeleton-${skeletonType}`} style={baseStyle} />
  );
}
