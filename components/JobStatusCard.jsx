import Badge from "./Badge";
import "./JobStatusCard.css";
import { normalizeStatusLabel, ScheduleJobStatus } from "@/lib/scheduleJobContract";

/**
 * JobStatusCard Component
 *
 * Displays a schedule generation job as a status row
 * with date, session count, and job status badge.
 * Used in the coordinator schedule generate page.
 *
 * @component
 * @example
 * <JobStatusCard job={job} />
 */
export default function JobStatusCard({ job }) {
  const statusVariant = {
    [ScheduleJobStatus.COMPLETED]: "success",
    [ScheduleJobStatus.COMPLETED_FALLBACK]: "warning",
    [ScheduleJobStatus.RUNNING]: "info",
    [ScheduleJobStatus.FAILED]: "danger",
    [ScheduleJobStatus.FAILED_INFEASIBLE]: "danger",
    [ScheduleJobStatus.PENDING]: "warning",
  }[job.status] ?? "default";

  const date = job.created_at
    ? new Date(job.created_at).toLocaleDateString("en-US", {
        year:  "numeric",
        month: "short",
        day:   "numeric",
      })
    : "--";

  const time = job.created_at
    ? new Date(job.created_at).toLocaleTimeString("en-US", {
        hour:   "2-digit",
        minute: "2-digit",
      })
    : "";

  const metaText =
    job.status_message ||
    job.error?.message ||
    `${job.sessions_count ?? "--"} sessions generated`;

  return (
    <div className="job-status-card">
      <div className="job-status-card__time">
        <span>{date}</span>
        <span>{time}</span>
      </div>
      <div className="job-status-card__info">
        <p className="job-status-card__title">{job.term_label ?? "Schedule Job"}</p>
        <p className="job-status-card__meta">{metaText}</p>
      </div>
      <Badge variant={statusVariant} size="sm">{normalizeStatusLabel(job.status)}</Badge>
    </div>
  );
}
