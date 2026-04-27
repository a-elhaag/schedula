import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { logger } from "@/lib/logger";

const TOKEN_MIN_LENGTH = 16;

function validatePassword(password) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!hasUpper || !hasLower || !hasNumber) {
    return "Password must include uppercase, lowercase, and a number.";
  }

  return "";
}

export async function POST(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";
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
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (token.length < TOKEN_MIN_LENGTH) {
    return NextResponse.json(
      { message: "This invite link is invalid or has expired." },
      { status: 400 },
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 });
  }

  // Keep a consistent delay to reduce timing differences.
  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({
      invite_token: token,
      invite_expires_at: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "This invite link is invalid or has expired." },
        { status: 400 },
      );
    }

    if (email && email !== user.email.toLowerCase()) {
      logger.warn(
        { requestId, userId: user._id.toString(), email },
        "Accept invite email mismatch",
      );
      return NextResponse.json(
        { message: "This invite link does not match the provided email." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password_hash: passwordHash,
          invite_status: "joined",
          email_verified_at: new Date(),
          email_verify_token: null,
          email_verify_expires_at: null,
          invite_token: null,
          invite_expires_at: null,
          ...(name ? { name } : {}),
        },
      },
    );

    logger.info(
      { requestId, userId: user._id.toString(), email: user.email },
      "Invite accepted and auto-verified successfully",
    );
    return NextResponse.json({
      ok: true,
      message: "Account created. You can now sign in.",
    });
  } catch (error) {
    logger.error(
      { requestId, email, error: error.message, stack: error.stack },
      "Accept invite error",
    );
    return NextResponse.json(
      { message: "Unable to accept invite right now." },
      { status: 500 },
    );
  }
}
