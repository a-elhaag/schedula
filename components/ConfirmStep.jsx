import Button from "./Button";
import "./ConfirmStep.css";

/**
 * ConfirmStep Component
 *
 * Shows a summary of selected availability slots before final submission.
 * Used inside the staff availability page as the review step.
 *
 * @component
 * @example
 * <ConfirmStep
 *   summary={{ Monday: ["08:00","09:00"] }}
 *   slotLabels={slotLabels}
 *   onBack={() => setStep("select")}
 *   onConfirm={handleSubmit}
 *   submitting={false}
 * />
 *
 * @param {Object}   summary    - Grouped slots by day { day: [slot, ...] }
 * @param {Function} slotLabel  - Function to convert slot string to display label
 * @param {Function} onBack     - Called when user clicks back
 * @param {Function} onConfirm  - Called when user confirms submission
 * @param {boolean}  submitting - Whether submission is in progress
 */
export default function ConfirmStep({ summary, slotLabel, onBack, onConfirm, submitting }) {
  return (
    <div className="confirm-step">
      <h3 className="confirm-step__title">Review Your Availability</h3>
      <p className="confirm-step__subtitle">
        Check your selected slots before submitting to the coordinator.
      </p>

      <div className="confirm-summary">
        {Object.keys(summary).length === 0 ? (
          <p className="confirm-empty">No slots selected.</p>
        ) : (
          Object.entries(summary).map(([day, slots]) => (
            <div key={day} className="confirm-summary__row">
              <span className="confirm-summary__day">{day}</span>
              <div className="confirm-summary__slots">
                {slots.map(s => (
                  <span key={s} className="confirm-summary__slot">
                    {slotLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="confirm-warning">
        Once submitted, your availability will be locked until the coordinator
        reopens the submission window.
      </div>

      <div className="confirm-actions">
        {/* Uses existing Button from components/Button.jsx */}
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          &#8592; Edit Slots
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={submitting || Object.keys(summary).length === 0}
        >
          {submitting ? "Submitting..." : "Confirm & Submit"}
        </Button>
      </div>
    </div>
  );
}
