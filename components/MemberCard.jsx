import Badge from "./Badge";
import "./MemberCard.css";

/**
 * MemberCard Component
 *
 * Displays a staff member card with role badge, workload meter,
 * and availability status. Used in the coordinator staff management page.
 *
 * @component
 * @example
 * <MemberCard member={member} />
 */
export default function MemberCard({ member }) {
  const statusVariant = {
    "Available": "success",
    "Limited":   "warning",
    "High Load": "danger",
  }[member.statusLabel] ?? "default";

  const workload   = member.workload ?? 0;
  const meterClass = workload >= 90 ? "meter-fill--high"
    : workload >= 70 ? "meter-fill--med"
    : "meter-fill--low";

  const initials = member.name
    .split(" ")
    .slice(0, 2)
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <article className="member-card">
      <div className="member-header">
        <div className="avatar">{initials}</div>
        <Badge variant={member.role === "professor" ? "info" : "default"} size="sm">
          {member.role === "ta" ? "Teaching Assistant" : "Professor"}
        </Badge>
      </div>
      <h3>{member.name}</h3>
      <p className="member-department">{member.email}</p>
      <div className="meter-row">
        <p>Workload</p>
        <p>{workload}%</p>
      </div>
      <div className="meter-track">
        <div
          className={`meter-fill ${meterClass}`}
          style={{ "--workload": `${workload}%` }}
        />
      </div>
      <div className="member-status-row">
        <Badge variant={statusVariant} size="sm">
          {member.statusLabel ?? "Unknown"}
        </Badge>
        <p className="member-sessions">{member.sessionCount ?? 0} sessions</p>
      </div>
    </article>
  );
}
