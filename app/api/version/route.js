import { getDb } from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

/**
 * GET /api/version
 * Returns the current version hashes for the authenticated user's data.
 * Used by the client to check whether cached data is still fresh.
 * Returns: { schedule: string|null, availability: string|null }
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = payload.sub;
  const institutionId = payload.institution;

  try {
    const db = await getDb();

    const [availability, schedule] = await Promise.all([
      db.collection("availability").findOne(
        { user_id: new ObjectId(userId) },
        { projection: { version_hash: 1, _id: 0 } }
      ),
      institutionId
        ? db.collection("schedules").findOne(
            { institution_id: new ObjectId(institutionId), is_published: true },
            { projection: { version_hash: 1, _id: 1 } }
          )
        : Promise.resolve(null),
    ]);

    return Response.json(
      {
        availability: availability?.version_hash ?? null,
        schedule: schedule?.version_hash ?? schedule?._id?.toString() ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error("[/api/version] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
