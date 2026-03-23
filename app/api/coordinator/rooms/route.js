import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorRooms } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";

export const GET = withApiErrorHandling(async function getCoordinatorRoomsRoute(
  request,
) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { searchParams } = new URL(request.url);

    const building = searchParams.get("building") ?? undefined;
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Math.min(
      Math.max(Number.isNaN(parsedLimit) ? 100 : parsedLimit, 0),
      500,
    );
    const parsedSkip = Number.parseInt(searchParams.get("skip") ?? "", 10);
    const skip = Math.max(Number.isNaN(parsedSkip) ? 0 : parsedSkip, 0);

    const result = await getCoordinatorRooms(user.institutionId, {
      building,
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
