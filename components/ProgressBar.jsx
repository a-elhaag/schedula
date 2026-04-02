import "./ProgressBar.css";

/**
 * ProgressBar Component
 *
 * Displays a labeled progress bar with percentage value.
 * Used in schedule generate page for solver progress tracking.
 *
 * @component
 * @example
 * <ProgressBar value={75} label="Solver is running..." />
 */
export default function ProgressBar({ value, label }) {
  const pct = Math.min(Math.max(value ?? 0, 0), 100);

  return (
    <div className="progress-bar">
      <div className="progress-bar__header">
        <span className="progress-bar__label">{label}</span>
        <span className="progress-bar__pct">{pct}%</span>
      </div>
      <div className="progress-bar__track">
        <div
          className="progress-bar__fill"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
