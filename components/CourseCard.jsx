import Badge from "./Badge";
import Button from "./Button";
import { EditIcon, TrashIcon } from "./icons/index";
import "./CourseCard.css";

/**
 * CourseCard Component
 *
 * Displays a course card with type badge, section count,
 * and enrollment fill rate bar. Used in coordinator courses page.
 *
 * @component
 * @example
 * <CourseCard course={course} />
 */
export default function CourseCard({ course, onEdit, onDelete }) {
  const typeVariant = {
    Lecture:  "info",
    Lab:      "warning",
    Tutorial: "success",
  }[course.type] ?? "default";

  const fillColor = (course.fillRate ?? 0) >= 90 ? "danger"
    : (course.fillRate ?? 0) >= 70 ? "warning"
    : "success";

  return (
    <article className="course-card">
      <div className="course-head">
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="course-code">{course.code}</span>
          {course.type && (
            <Badge variant={typeVariant} size="sm">{course.type}</Badge>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {onEdit && <Button variant="ghost" size="sm" icon={<EditIcon size={14} />} onClick={() => onEdit(course)} />}
          {onDelete && <Button variant="ghost" size="sm" icon={<TrashIcon size={14} />} onClick={() => onDelete(course.id)} />}
        </div>
      </div>
      <h3>{course.name}</h3>
      <p className="course-credits">{course.credits} credit hours</p>
      <div className="course-meta-row">
        <p>{course.sectionCount} Section{course.sectionCount !== 1 ? "s" : ""}</p>
      </div>
      {course.fillRate != null && (
        <>
          <div className="fill-row">
            <p>Enrollment Fill</p>
            <p className={`fill-pct fill-pct--${fillColor}`}>{course.fillRate}%</p>
          </div>
          <div className="fill-track">
            <div
              className="fill-bar"
              style={{ "--fill-width": `${course.fillRate}%` }}
            />
          </div>
        </>
      )}
    </article>
  );
}
