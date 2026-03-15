import Button from "./Button";
import "./ErrorState.css";

/**
 * ErrorState Component
 *
 * Shown when data fetching fails. Displays the error message
 * and a retry button using the existing Button component.
 *
 * @component
 * @example
 * <ErrorState message="Failed to load schedule" onRetry={fetchSchedule} />
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-state__icon">⚠️</div>
      <h3 className="error-state__title">Could not load schedule</h3>
      <p className="error-state__message">{message}</p>
      {/* Uses existing Button component from components/Button.jsx */}
      <Button variant="primary" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}
