import Switch from "./Switch";
import "./HardConstraintRow.css";

/**
 * HardConstraintRow Component
 *
 * Displays a hard scheduling constraint with a toggle switch.
 * Hard constraints must always be satisfied by the solver.
 * Used in the coordinator constraints page.
 *
 * @component
 * @example
 * <HardConstraintRow
 *   constraint={{ key: "no_room_overlap", label: "No Room Double-Booking", description: "..." }}
 *   enabled={true}
 *   onChange={(key, value) => {}}
 * />
 */
export default function HardConstraintRow({ constraint, enabled, onChange }) {
  return (
    <div className="hard-constraint-row">
      <div className="hard-constraint-row__info">
        <p className="hard-constraint-row__label">{constraint.label}</p>
        <p className="hard-constraint-row__desc">{constraint.description}</p>
      </div>
      <div className="hard-constraint-row__control">
        <Switch
          checked={enabled}
          onChange={val => onChange(constraint.key, val)}
        />
        <span className="constraint-badge constraint-badge--hard">Hard</span>
      </div>
    </div>
  );
}
