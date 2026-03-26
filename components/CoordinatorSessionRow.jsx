import Badge from "./Badge";
import "./CoordinatorSessionRow.css";

/**
 * CoordinatorSessionRow Component
 *
 * Displays a session as a horizontal row with time, course info,
 * instructor, room, and conflict highlight.
 * Used in coordinator schedule review and published pages.
 * Different from student SessionCard which is a clickable card with overlay.
 *
 * @component
 * @example
 * <CoordinatorSessionRow session={session} hasConflict={false} />
 */
export default function CoordinatorSessionRow({ session, hasConflict = false }) {
  const typeVariant = {
    Lecture:  "info",
    Lab:      "warning",
    Tutorial: "success",
  }[session.type] ?? "default";

  function fmt(t) {
    if (!t) return "";
    const [hStr, mStr] = t.split(":");
    let h = parseInt(hStr, 10);
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${mStr ?? "00"} ${period}`;
  }

  return (
    <article className={`coord-session-row ${hasConflict ? "coord-session-row--conflict" : ""}`}>
      <div className="coord-session-row__time">
        <span>{session.day}</span>
        <span>{fmt(session.start)} - {fmt(session.end)}</span>
      </div>
      <div className="coord-session-row__info">
        <p className="coord-session-row__title">
          <span className="coord-session-row__code">{session.code}</span>
          {session.name ? ` - ${session.name}` : ""}
        </p>
        <p className="coord-session-row__meta">
          {session.instructor} &nbsp;|&nbsp; {session.room}
        </p>
      </div>
      <div className="coord-session-row__badges">
        <Badge variant={typeVariant} size="sm">{session.type}</Badge>
        {hasConflict && <Badge variant="danger" size="sm">Conflict</Badge>}
      </div>
    </article>
  );
}
