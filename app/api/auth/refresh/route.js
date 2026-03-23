import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { comparePassword } from "@/lib/password";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";

export async function POST(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Anti-timing delay
  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    const refreshTokenCookie = request.cookies.get("refresh_token")?.value;

    if (!refreshTokenCookie) {
      return NextResponse.json(
        { message: "Refresh token missing." },
        { status: 401 },
      );
    }

    // Refresh token format: userId.randomTokenString
    const parts = refreshTokenCookie.split(".");
    if (parts.length !== 2) {
      return NextResponse.json(
        { message: "Invalid refresh token format." },
        { status: 401 },
      );
    }

    const [userIdStr, tokenStr] = parts;
    let userId;
    try {
      userId = new ObjectId(userIdStr);
    } catch {
      return NextResponse.json(
        { message: "Invalid user ID." },
        { status: 401 },
      );
    }

    const db = await getDb();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: userId });

    if (!user || user.invite_status !== "joined" || !user.email_verified_at) {
      return NextResponse.json(
        { message: "User account is invalid or inactive." },
        { status: 401 },
      );
    }

    if (!user.refresh_token_hash) {
      return NextResponse.json(
        { message: "Refresh token has been revoked or never issued." },
        { status: 401 },
      );
    }

    // Compare token against stored hash (reuse comparePassword for bcrypt compare)
    const isValid = await comparePassword(tokenStr, user.refresh_token_hash);

    if (!isValid) {
      // Possible token theft detected (someone used an old/invalid token with the right ID structure)
      // Ideally we would revoke the token here, but for now we just fail.
      logger.warn(
        { requestId, userId: userIdStr },
        "Invalid refresh token attempt",
      );
      return NextResponse.json(
        { message: "Invalid refresh token." },
        { status: 401 },
      );
    }

    // Generate new short-lived auth token (30-minute TTL)
    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      institution: user.institution_id.toString(),
    });

    const response = NextResponse.json(
      {
        ok: true,
        user: { id: user._id.toString(), email: user.email, role: user.role },
      },
      { status: 200 },
    );

    // Refresh the auth_token cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    logger.info({ requestId, userId: user._id.toString() }, "Token refreshed successfully");
    return response;
  } catch (error) {
    logger.error(
      { requestId, error: error.message, stack: error.stack },
      "Token refresh error",
    );
    return NextResponse.json(
      { message: "An error occurred during token refresh." },
      { status: 500 },
    );
  }
}
