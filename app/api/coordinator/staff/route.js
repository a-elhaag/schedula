import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorStaff, getStaffWorkload } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";

export const GET = withApiErrorHandling(async function getCoordinatorStaffRoute(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { searchParams } = new URL(request.url);

    const role = searchParams.get("role") ?? undefined;
    const staffIds = searchParams.get("staffIds") ? searchParams.get("staffIds").split(',') : [];
    const parsedLimit = parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isNaN(parsedLimit) ? 100 : Math.min(Math.max(parsedLimit, 0), 500);
    const parsedSkip = parseInt(searchParams.get("skip") || "", 10);
    const skip = Number.isNaN(parsedSkip) ? 0 : Math.max(parsedSkip, 0);

    const result = await getCoordinatorStaff(user.institutionId, {
      role,
      limit,
      skip,
    });

    // Compute workloads if specific staff requested
    if (staffIds.length > 0) {
      const workloads = await Promise.all(
        staffIds.map(id => getStaffWorkload(user.institutionId, id))
      );
      result.workloads = workloads;
    }

    return jsonOk(result);
  } catch (error) {
    if (error?.status === 400) {
      return jsonError(error.message, 400);
    }
    throw error;
  }
});

