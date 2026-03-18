import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";

export async function GET(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";
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
