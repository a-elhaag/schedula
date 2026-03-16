import React from "react";
import "./StatCard.css";

/**
 * StatCard Component for the Schedula analytics dashboard.
 * Features the signature 44px border radius, soft shadows, and hover scale animations.
 */
export function StatCard({ label, value, trend, Icon, trendUp = true }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        {Icon && (
          <div className="stat-card-icon">
            <Icon width={24} height={24} />
          </div>
        )}
        <div className="stat-card-label">{label}</div>
      </div>

      <div className="stat-card-footer">
        <div className="stat-card-value">{value}</div>
        {trend && (
          <div
            className={`stat-card-trend ${trendUp ? "trend-up" : "trend-down"}`}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </div>
        )}
      </div>
    </div>
  );
}
