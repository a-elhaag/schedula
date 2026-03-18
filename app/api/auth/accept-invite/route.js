import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";

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

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password_hash: passwordHash,
          invite_status: "joined",
          email_verified_at: new Date(),
          invite_token: null,
          invite_expires_at: null,
          ...(name ? { name } : {}),
        },
      },
    );

    return NextResponse.json({
      ok: true,
      message: "Invite accepted. You can now sign in.",
    });
  } catch (error) {
    console.error("[accept-invite] Error:", error);
    return NextResponse.json(
      { message: "Unable to accept invite right now." },
      { status: 500 },
    );
  }
}
