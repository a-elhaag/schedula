import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  validateEmail,
  generatePasswordResetToken,
  sendPasswordResetEmail,
} from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";

const ANTI_ENUMERATION_DELAY_MS = 300;
const DEFAULT_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

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
  const allowed = await checkRateLimit("forgotPassword", clientIp);
  if (!allowed) {
    logger.warn(
      { requestId, clientIp },
      "Password reset rate limit exceeded",
    );
    return NextResponse.json(
      { message: DEFAULT_MESSAGE },
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

  const email = body?.email ? String(body.email).trim().toLowerCase() : "";

  if (!validateEmail(email)) {
    return NextResponse.json(
      { message: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  // Keep a consistent delay to avoid account-enumeration timing signals.
  await new Promise((resolve) => setTimeout(resolve, ANTI_ENUMERATION_DELAY_MS));

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email });

    if (user) {
      const token = await generatePasswordResetToken(user._id);
      const emailResult = await sendPasswordResetEmail(email, token, request);

      if (emailResult?.skipped && process.env.NODE_ENV === "production") {
        logger.warn({ requestId, email }, "Password reset email send skipped");
        return NextResponse.json(
          { message: "Unable to send reset email right now." },
          { status: 503 },
        );
      }

      logger.info(
        { requestId, userId: user._id.toString() },
        "Password reset email sent",
      );
      return NextResponse.json({
        ok: true,
        message: DEFAULT_MESSAGE,
        resetToken:
          emailResult?.skipped && process.env.NODE_ENV !== "production"
            ? token
            : undefined,
      });
    }

    // Return same message whether user exists or not (security: prevent account enumeration)
    return NextResponse.json({
      ok: true,
      message: DEFAULT_MESSAGE,
    });
  } catch (error) {
    logger.error(
      { requestId, email, error: error.message, stack: error.stack },
      "Password reset error",
    );
    return NextResponse.json(
      { message: "Unable to process password reset right now." },
      { status: 500 },
    );
  }
}
