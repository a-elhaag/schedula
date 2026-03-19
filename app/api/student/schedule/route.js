import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getStudentSchedule } from "@/lib/server/studentScheduleService";

export const GET = withApiErrorHandling(async function getStudentScheduleRoute(
  request,
) {
  const { searchParams } = new URL(request.url);
  const institutionId = searchParams.get("institutionId") ?? undefined;
  const termLabel = searchParams.get("term") ?? undefined;
  const day = searchParams.get("day") ?? undefined;
  const instructorId = searchParams.get("instructorId") ?? undefined;
  const courseCode = searchParams.get("courseCode") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);
  const skip = Math.max(parseInt(searchParams.get("skip") || "0"), 0);

  try {
    const schedule = await getStudentSchedule({
      institutionId,
      termLabel,
      day,
      instructorId,
      courseCode,
      limit,
      skip,
    });

    if (!schedule) {
      return jsonError("No schedule found", 404);
    }

    return jsonOk(schedule);
  } catch (error) {
    if (error?.status === 400) {
      return jsonError(error.message, 400);
    }

    throw error;
  }
});
