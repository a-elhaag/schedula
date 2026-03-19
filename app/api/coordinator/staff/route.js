import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorStaff } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";
import { parseSearchParams } from "@/lib/server/utils";

export const GET = withApiErrorHandling(async function getCoordinatorStaffRoute(
  request,
) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);

    // OPTIMIZATION: Centralized parameter parsing
    const { limit, skip } = parseSearchParams(searchParams, {
      limit: { default: 100, max: 500 },
      skip: { default: 0 },
    });

    const role = searchParams.get("role") ?? undefined;

    const result = await getCoordinatorStaff(user.institutionId, {
      role,
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
