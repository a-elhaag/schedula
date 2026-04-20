import { useState } from "react";
import Button from "./Button";
import { WarningIcon } from "./icons/index";
import "./ConflictPanel.css";

/**
 * ConflictPanel Component
 *
 * Displays active and resolved conflicts with resolution controls.
 * Used in the coordinator schedule review page.
 *
 * @component
 * @example
 * <ConflictPanel conflicts={conflicts} onResolve={onResolve} onReopen={onReopen} />
 */
export default function ConflictPanel({
  conflicts,
  resolvedConflicts = [],
  onResolve,
  onReopen,
  resolvingConflictKey,
}) {
  const [drafts, setDrafts] = useState({});

  if (!conflicts?.length && !resolvedConflicts?.length) return null;

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

  function getDefaultAction(conflictType) {
    return conflictType === "room" ? "reassign_room" : "reassign_staff";
  }

  function getDraft(conflict) {
    const key = conflict.conflictKey || `${conflict.type}:${conflict.slot}`;
    return (
      drafts[key] ?? {
        resolutionAction: getDefaultAction(conflict.type),
        notes: "",
      }
    );
  }

  function updateDraft(conflict, patch) {
    const key = conflict.conflictKey || `${conflict.type}:${conflict.slot}`;
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...getDraft(conflict),
        ...patch,
      },
    }));
  }

  function formatAction(action) {
    if (!action) return "";
    return action.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  return (
    <div className="conflict-panel">
      <h2 className="conflict-panel__title">
        Active Conflicts ({conflicts?.length ?? 0})
      </h2>

      {(conflicts ?? []).map((conflict, i) => {
        const draft = getDraft(conflict);
        const label = conflict.type === "room"
          ? "Room Double-Booked"
          : "Staff Double-Booked";
        const conflictKey = conflict.conflictKey || `${conflict.type}:${conflict.slot}`;
        const isResolving = resolvingConflictKey === conflictKey;

        return (
          <div key={conflictKey || i} className="conflict-item conflict-item--active">
            <div className="conflict-item__left conflict-item__left--grow">
              <WarningIcon size={16} />
              <div className="conflict-item__content">
                <p className="conflict-item__label">{label}</p>
                <p className="conflict-item__slot">{formatSlot(conflict.slot)}</p>

                <div className="conflict-item__controls">
                  <label className="conflict-field">
                    <span>Resolution</span>
                    <select
                      value={draft.resolutionAction}
                      onChange={(event) =>
                        updateDraft(conflict, { resolutionAction: event.target.value })
                      }
                      disabled={isResolving}
                    >
                      <option value="reassign_room">Reassign room</option>
                      <option value="reassign_staff">Reassign staff</option>
                      <option value="move_slot">Move session slot</option>
                      <option value="accept_risk">Accept risk</option>
                    </select>
                  </label>

                  <label className="conflict-field conflict-field--notes">
                    <span>Notes</span>
                    <input
                      type="text"
                      value={draft.notes}
                      onChange={(event) => updateDraft(conflict, { notes: event.target.value })}
                      placeholder="Optional context for this decision"
                      disabled={isResolving}
                    />
                  </label>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={isResolving}
              onClick={() => onResolve?.(conflict, draft.resolutionAction, draft.notes)}
            >
              {isResolving ? "Saving..." : "Resolve"}
            </Button>
          </div>
        );
      })}

      {(resolvedConflicts ?? []).length > 0 && (
        <>
          <h3 className="conflict-panel__resolved-title">
            Resolved Conflicts ({resolvedConflicts.length})
          </h3>
          {resolvedConflicts.map((conflict, i) => {
            const conflictKey = conflict.conflictKey || `${conflict.type}:${conflict.slot}`;
            const isResolving = resolvingConflictKey === conflictKey;
            return (
              <div key={conflictKey || `resolved-${i}`} className="conflict-item conflict-item--resolved">
                <div className="conflict-item__left conflict-item__left--grow">
                  <div className="conflict-item__content">
                    <p className="conflict-item__label">
                      {conflict.type === "room" ? "Room Double-Booked" : "Staff Double-Booked"}
                    </p>
                    <p className="conflict-item__slot">{formatSlot(conflict.slot)}</p>
                    <p className="conflict-item__resolved-meta">
                      Resolved via <strong>{formatAction(conflict.resolutionAction)}</strong>
                      {conflict.resolvedBy ? ` by ${conflict.resolvedBy}` : ""}
                    </p>
                    {conflict.resolutionNotes ? (
                      <p className="conflict-item__resolved-meta">Note: {conflict.resolutionNotes}</p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isResolving}
                  onClick={() => onReopen?.(conflict)}
                >
                  {isResolving ? "Saving..." : "Reopen"}
                </Button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
