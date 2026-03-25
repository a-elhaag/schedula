import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorCourses, createCourse } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";

export const GET = withApiErrorHandling(async function getCoordinatorCoursesRoute(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { searchParams } = new URL(request.url);

    const departmentId = searchParams.get("departmentId") ?? undefined;
    const rawLimit = parseInt(searchParams.get("limit") ?? "100", 10);
    const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 100 : rawLimit, 0), 500);
    const rawSkip = parseInt(searchParams.get("skip") ?? "0", 10);
    const skip = Math.max(Number.isNaN(rawSkip) ? 0 : rawSkip, 0);

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

export const POST = withApiErrorHandling(async function createCourseRoute(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const courseData = await request.json();

    const course = await createCourse(user.institutionId, courseData);
    return jsonOk(course, 201);
  } catch (error) {
    if (error?.status === 400) return jsonError(error.message, 400);
    throw error;
  }
});

