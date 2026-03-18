import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { generateToken } from "@/lib/auth";
import { buildEmailTemplate, getBaseUrl, sendEmail } from "@/lib/email";

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
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 },
    );
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

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

    const passwordHash = await hashPassword(password);
    const emailVerifyToken = generateToken();
    const emailVerifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password_hash: passwordHash,
          invite_status: "pending",
          email_verified_at: null,
          email_verify_token: emailVerifyToken,
          email_verify_expires_at: emailVerifyExpiresAt,
          invite_token: null,
          invite_expires_at: null,
          ...(name ? { name } : {}),
        },
      },
    );

    const baseUrl = getBaseUrl(request);
    const verificationLink = `${baseUrl}/verify-email?token=${encodeURIComponent(
      emailVerifyToken,
    )}&email=${encodeURIComponent(user.email)}`;

    const template = buildEmailTemplate({
      type: "verify",
      actionUrl: verificationLink,
    });

    const emailResult = await sendEmail({
      to: user.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    return NextResponse.json({
      ok: true,
      message: "Invite accepted. Please verify your email to continue.",
      verificationToken:
        emailResult?.skipped && process.env.NODE_ENV !== "production"
          ? emailVerifyToken
          : undefined,
    });
  } catch (error) {
    console.error("[accept-invite] Error:", error);
    return NextResponse.json(
      { message: "Unable to accept invite right now." },
      { status: 500 },
    );
  }
}
