export const ScheduleJobStatus = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  COMPLETED_FALLBACK: "completed_fallback",
  FAILED: "failed",
  FAILED_INFEASIBLE: "failed_infeasible",
});

function toStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim() !== "");
}

export function isSolverInfeasibleResult(solved) {
  if (!solved || typeof solved !== "object") return false;

  if (Number(solved.hard_violations ?? 0) > 0) {
    return true;
  }

  const validationErrors = toStringList(solved.summary?.validation_errors);
  if (validationErrors.length > 0) {
    return true;
  }

  const warnings = toStringList(solved.warnings);
  const warningText = warnings.join(" ").toLowerCase();
  if (warningText.includes("infeasible") || warningText.includes("no feasible")) {
    return true;
  }

  const entries = Array.isArray(solved.entries) ? solved.entries : [];
  if (entries.length === 0 && warningText.includes("hard constraint")) {
    return true;
  }

  return false;
}

export function buildInfeasibleError(solved) {
  const validationErrors = toStringList(solved?.summary?.validation_errors);
  const warnings = toStringList(solved?.warnings);
  const details = [...validationErrors, ...warnings].slice(0, 10);

  return {
    type: "infeasible",
    message:
      details[0] ??
      "Solver reported an infeasible schedule. Review constraints, room capacity, and staff availability.",
    validationErrors,
    warnings,
  };
}

export function normalizeStatusLabel(status) {
  if (!status) return "unknown";
  return status.replace(/_/g, " ");
}
