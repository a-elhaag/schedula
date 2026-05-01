import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";

const TOKEN_MIN_LENGTH = 16;

function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";
  const clientIp = getClientIp(request);

  // Check rate limit
  const allowed = await checkRateLimit("verifyEmail", clientIp);
  if (!allowed) {
    logger.warn(
      { requestId, clientIp },
      "Email verification rate limit exceeded",
    );
    return NextResponse.json(
      { message: "Too many verification attempts. Please try again later." },
      { status: 429 },
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    logger.warn({ requestId }, "Invalid request payload");
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 },
    );
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (token.length < TOKEN_MIN_LENGTH) {
    return NextResponse.json(
      { message: "This verification link is invalid or has expired." },
      { status: 400 },
    );
  }

  // Keep a consistent delay to reduce timing differences.
  await new Promise((resolve) => setTimeout(resolve, 320));

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({
      email_verify_token: token,
      email_verify_expires_at: { $gt: new Date() },
    });

    if (!user) {
      // Check if user exists but token is expired or invalid
      const userWithInvalidToken = await usersCollection.findOne({
        email_verify_token: token,
      });

      if (userWithInvalidToken) {
        logger.warn(
          { requestId, userId: userWithInvalidToken._id.toString() },
          "Email verification attempted with expired token",
        );
      }

      return NextResponse.json(
        { message: "This verification link is invalid or has expired." },
        { status: 400 },
      );
    }

    // Check if already verified to prevent re-verification
    if (user.email_verified_at) {
      logger.info(
        { requestId, userId: user._id.toString() },
        "Email verification attempted for already-verified account",
      );
      return NextResponse.json({
        ok: true,
        message: "This email has already been verified. You can sign in.",
      });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          email_verified_at: new Date(),
          invite_status: "joined",
          email_verify_token: null,
          email_verify_expires_at: null,
        },
      },
    );

    logger.info(
      { requestId, userId: user._id.toString() },
      "Email verified successfully",
    );
    return NextResponse.json({
      ok: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    logger.error(
      { requestId, error: error.message, stack: error.stack },
      "Email verification error",
    );
    return NextResponse.json(
      { message: "Unable to verify email right now." },
      { status: 500 },
    );
  }
}
