import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  validateEmail,
  generateEmailVerificationToken,
  sendEmailVerification,
} from "@/lib/auth-helpers";

const ANTI_ENUMERATION_DELAY_MS = 300;
const DEFAULT_MESSAGE =
  "If an account exists for this email, a new verification link has been sent.";

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

    // Send verification email only if user exists and email is not verified
    if (user && !user.email_verified_at) {
      const token = await generateEmailVerificationToken(user._id);
      const emailResult = await sendEmailVerification(email, token, request);

      if (emailResult?.skipped && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { message: "Unable to resend verification email right now." },
          { status: 503 },
        );
      }

      return NextResponse.json({
        ok: true,
        message: DEFAULT_MESSAGE,
        verificationToken:
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
    console.error("[resend-verification] Error:", error);
    return NextResponse.json(
      { message: "Unable to resend verification email right now." },
      { status: 500 },
    );
  }
}
