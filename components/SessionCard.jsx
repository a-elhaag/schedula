import React, { useState } from "react";
import "./SessionCard.css";

/**
 * SessionCard matching the DesignSpec for handling courses/sessions.
 * Incorporates the 44px border-radius, left accent border, and scale animation.
 */
export function SessionCard({
  time,
  title,
  type = "Lecture",
  instructor,
  room,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Styling maps based on Design Spec
  const badgeClasses = {
    Lecture: "session-card-badge type-lecture",
    Tutorial: "session-card-badge type-tutorial",
    Lab: "session-card-badge type-lab",
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`session-card ${isExpanded ? "expanded" : ""}`}
    >
      <div>
        <div className="session-card-time">{time}</div>
        <div className="session-card-header">
          <h3 className="session-card-title">{title}</h3>
          <span className={badgeClasses[type] || badgeClasses["Lecture"]}>
            {type}
          </span>
        </div>
      </div>

      <div>
        <hr className="session-card-divider" />
        <div className="session-card-details">
          <div className="session-card-detail-item">
            <span className="session-card-icon">👤</span>
            {instructor}
          </div>
          <div className="session-card-detail-item">
            <span className="session-card-icon">📍</span>
            {room}
          </div>
        </div>
      </div>
    </div>
  );
}
