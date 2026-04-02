import ConstraintWeightSlider from "./ConstraintWeightSlider";
import "./SoftConstraintRow.css";

/**
 * SoftConstraintRow Component
 *
 * Displays a soft scheduling constraint with a weight slider.
 * Soft constraints are optimized by the solver when possible.
 * Higher weight = higher priority during optimization.
 * Used in the coordinator constraints page.
 *
 * @component
 * @example
 * <SoftConstraintRow
 *   constraint={{ key: "minimize_gaps", label: "Minimize Staff Gaps", description: "..." }}
 *   weight={75}
 *   onChange={(key, value) => {}}
 * />
 */
export default function SoftConstraintRow({ constraint, weight, onChange }) {
  return (
    <div className="soft-constraint-row">
      <div className="soft-constraint-row__info">
        <p className="soft-constraint-row__label">{constraint.label}</p>
        <p className="soft-constraint-row__desc">{constraint.description}</p>
      </div>
      <div className="soft-constraint-row__slider">
        <ConstraintWeightSlider
          value={weight}
          onChange={val => onChange(constraint.key, val)}
        />
        <span className="constraint-badge constraint-badge--soft">Soft</span>
      </div>
    </div>
  );
}
