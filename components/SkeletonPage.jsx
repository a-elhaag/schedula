import "./Skeleton.css";
import "./SkeletonPage.css";

/**
 * Generic skeleton for coordinator pages while data loads.
 * Mirrors the hero + stat-grid + panel layout used throughout the app.
 *
 * @param {{ rows?: number, stats?: number }} props
 */
export default function SkeletonPage({ rows = 4, stats = 3 }) {
  return (
    <div className="skp-wrap">
      {/* Hero */}
      <div className="skp-hero">
        <div className="skeleton skp-eyebrow" />
        <div className="skeleton skp-title" />
        <div className="skeleton skp-subtitle" />
      </div>

      {/* Stat cards */}
      <div className="skp-stats" style={{ "--skp-cols": stats }}>
        {Array.from({ length: stats }).map((_, i) => (
          <div key={i} className="skeleton skp-stat" />
        ))}
      </div>

      {/* Panel */}
      <div className="skp-panel">
        <div className="skp-panel-head">
          <div className="skeleton skp-panel-title" />
          <div className="skeleton skp-panel-btn" />
        </div>
        <div className="skp-rows">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="skeleton skp-row" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
