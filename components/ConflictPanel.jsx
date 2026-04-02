import Button from "./Button";
import { WarningIcon } from "./icons/index";
import "./ConflictPanel.css";

/**
 * ConflictPanel Component
 *
 * Displays a list of detected scheduling conflicts with dismiss buttons.
 * Used in the coordinator schedule review page.
 *
 * @component
 * @example
 * <ConflictPanel conflicts={conflicts} onDismiss={dismissConflict} />
 */
export default function ConflictPanel({ conflicts, onDismiss }) {
  if (!conflicts?.length) return null;

  function formatSlot(slot) {
    if (!slot) return "";
    const parts = slot.split("-");
    const day   = parts[0] ?? "";
    const start = parts[1] ?? "";
    if (!start) return day;
    const [hStr] = start.split(":");
    let h = parseInt(hStr, 10);
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${day} at ${h}:00 ${period}`;
  }

  return (
    <div className="conflict-panel">
      <h2 className="conflict-panel__title">
        Active Conflicts ({conflicts.length})
      </h2>
      {conflicts.map((conflict, i) => {
        const label = conflict.type === "room"
          ? "Room Double-Booked"
          : "Staff Double-Booked";
        return (
          <div key={i} className="conflict-item">
            <div className="conflict-item__left">
              <WarningIcon size={16} />
              <div>
                <p className="conflict-item__label">{label}</p>
                <p className="conflict-item__slot">{formatSlot(conflict.slot)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onDismiss(conflict)}>
              Dismiss
            </Button>
          </div>
        );
      })}
    </div>
  );
}
