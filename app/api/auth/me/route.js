import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";

export async function GET(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Check if bypass auth is enabled
  if (process.env.BYPASS_AUTH === "true") {
    // Use headers injected by proxy.js, then fall back to env defaults
    const userId =
      request.headers.get("x-user-id") ||
      process.env.BYPASS_AUTH_USER_ID ||
      "666666666666666666666601";
    const role =
      request.headers.get("x-user-role") ||
      process.env.BYPASS_AUTH_USER_ROLE ||
      "coordinator";
    const email =
      request.headers.get("x-user-email") ||
      process.env.BYPASS_AUTH_USER_EMAIL ||
      "coordinator@demo.local";
    const institution = "demo-institution";

    logger.debug(
      { requestId, userId },
      "Bypass auth enabled - returning demo user",
    );
    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email,
        role,
        institution,
      },
    });
  }

  const authToken = request.cookies.get("auth_token")?.value;
  const payload = authToken ? verifyToken(authToken) : null;

  if (!payload) {
    logger.warn({ requestId }, "Unauthorized /me request");
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  logger.debug({ requestId, userId: payload.sub }, "User info retrieved");
  return NextResponse.json({
    ok: true,
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      institution: payload.institution,
    },
  });
}
