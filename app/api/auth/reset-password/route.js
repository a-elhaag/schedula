import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const MIN_PASSWORD_LENGTH = 8;
const TOKEN_MIN_LENGTH = 16;

function validatePassword(password) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (password.length < MIN_PASSWORD_LENGTH) {
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

  if (token.length < TOKEN_MIN_LENGTH) {
    return NextResponse.json(
      { message: "This password reset link is invalid or has expired." },
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
      password_reset_token: token,
      password_reset_expires_at: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "This password reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password_hash: passwordHash,
        },
        $unset: {
          password_reset_token: "",
          password_reset_expires_at: "",
        },
      },
    );

    return NextResponse.json({
      ok: true,
      message:
        "Your password has been reset successfully. You can sign in now.",
    });
  } catch (error) {
    console.error("[reset-password] Error:", error);
    return NextResponse.json(
      { message: "Unable to reset password right now." },
      { status: 500 },
    );
  }
}
