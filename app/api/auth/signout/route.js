import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";

export async function POST(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";
  logger.info({ requestId }, "User signed out");

  // Revoke refresh token in DB so it can't be reused after logout
  try {
    const refreshTokenCookie = request.cookies.get("refresh_token")?.value;
    if (refreshTokenCookie) {
      const [userIdStr] = refreshTokenCookie.split(".");
      if (userIdStr && ObjectId.isValid(userIdStr)) {
        const db = await getDb();
        await db.collection("users").updateOne(
          { _id: new ObjectId(userIdStr) },
          { $set: { refresh_token_hash: null } },
        );
      }
    }
  } catch (err) {
    // Non-fatal — cookies still cleared below
    logger.warn({ requestId, error: err.message }, "Failed to revoke refresh token in DB");
  }

  const response = NextResponse.json({ ok: true, message: "Signed out." });

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
