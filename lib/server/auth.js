import { getDb } from "@/lib/db";

/**
 * Gets the current user's context from request headers or session.
 * In production, this would extract from JWT/session middleware.
 * For now, returns a default coordinator user for testing.
 *
 * @param {Request} _request
 * @returns {Promise<{userId: string, role: string, institutionId: string}>}
 */
export async function getCurrentUser(_request) {
  // In a real app, extract from headers or cookies:
  // const token = _request.headers.get('authorization')?.split(' ')[1];
  // const user = verifyToken(token);

  // For MVP, get the first coordinator
  const db = await getDb();
  const coordinator = await db
    .collection("users")
    .findOne({ role: "coordinator" }, { projection: { _id: 1, institution_id: 1 } });

  if (!coordinator) {
    throw new Error("No coordinator user found");
  }

  return {
    userId: coordinator._id.toString(),
    role: "coordinator",
    institutionId: coordinator.institution_id.toString(),
  };
}
