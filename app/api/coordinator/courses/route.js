import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorCourses } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";

export const GET = withApiErrorHandling(async function getCoordinatorCoursesRoute(
  request,
) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);

    const departmentId = searchParams.get("departmentId") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const skip = Math.max(parseInt(searchParams.get("skip") || "0"), 0);

    const result = await getCoordinatorCourses(user.institutionId, {
      departmentId,
      limit,
      skip,
    });

    return jsonOk(result);
  } catch (error) {
    if (error?.status === 400) {
      return jsonError(error.message, 400);
    }
    throw error;
  }
});
