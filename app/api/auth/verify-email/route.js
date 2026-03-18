import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const TOKEN_MIN_LENGTH = 16;

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 }
    );
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (token.length < TOKEN_MIN_LENGTH) {
    return NextResponse.json(
      { message: "This verification link is invalid or has expired." },
      { status: 400 }
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
      return NextResponse.json(
        { message: "This verification link is invalid or has expired." },
        { status: 400 },
      );
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

    return NextResponse.json({
      ok: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("[verify-email] Error:", error);
    return NextResponse.json(
      { message: "Unable to verify email right now." },
      { status: 500 },
    );
  }
}
