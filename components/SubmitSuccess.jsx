import Button from "./Button";
import "./SubmitSuccess.css";

/**
 * SubmitSuccess Component
 *
 * Success screen shown after staff successfully submits their availability.
 * Displays a summary of submitted slots and an option to edit.
 *
 * @component
 * @example
 * <SubmitSuccess
 *   summary={{ Monday: ["08:00","09:00"] }}
 *   slotLabel={(s) => "8AM"}
 *   onEdit={() => setStep("select")}
 * />
 *
 * @param {Object}   summary   - Grouped slots by day { day: [slot, ...] }
 * @param {Function} slotLabel - Function to convert slot string to display label
 * @param {Function} onEdit    - Called when user wants to edit availability
 */
export default function SubmitSuccess({ summary, slotLabel, onEdit }) {
  return (
    <div className="submit-success">

      {/* Check icon using SVG - no emoji */}
      <div className="submit-success__icon">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h2 className="submit-success__title">Availability Submitted</h2>
      <p className="submit-success__subtitle">
        The coordinator will use your availability to generate the optimal schedule.
      </p>

      <div className="submit-success__summary">
        {Object.entries(summary).map(([day, slots]) => (
          <div key={day} className="submit-success__row">
            <span className="submit-success__day">{day}</span>
            <div className="submit-success__slots">
              {slots.map(s => (
                <span key={s} className="submit-success__slot">
                  {slotLabel(s)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Uses existing Button from components/Button.jsx */}
      <Button variant="secondary" onClick={onEdit}>
        Edit Availability
      </Button>
    </div>
  );
}
