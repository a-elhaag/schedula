import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorRooms } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";

export const GET = withApiErrorHandling(async function getCoordinatorRoomsRoute(
  request,
) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);

    const building = searchParams.get("building") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const skip = Math.max(parseInt(searchParams.get("skip") || "0"), 0);

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
