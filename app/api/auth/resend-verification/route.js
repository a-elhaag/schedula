import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { getBaseUrl, sendEmail } from "@/lib/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { message: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  // Keep a consistent delay to avoid account-enumeration timing signals.
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ email });

    if (user && !user.email_verified_at) {
      const emailVerifyToken = generateToken();
      const emailVerifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            email_verify_token: emailVerifyToken,
            email_verify_expires_at: emailVerifyExpiresAt,
          },
        },
      );

      const baseUrl = getBaseUrl(request);
      const verificationLink = `${baseUrl}/verify-email?token=${encodeURIComponent(
        emailVerifyToken,
      )}&email=${encodeURIComponent(email)}`;

      const emailResult = await sendEmail({
        to: email,
        subject: "Verify your Schedula email",
        text: `Verify your email to activate your Schedula account: ${verificationLink}`,
        html: `<p>Verify your email to activate your Schedula account:</p><p><a href="${verificationLink}">Verify email</a></p>`,
      });

      return NextResponse.json({
        ok: true,
        message:
          "If an account exists for this email, a new verification link has been sent.",
        verificationToken:
          emailResult?.skipped && process.env.NODE_ENV !== "production"
            ? emailVerifyToken
            : undefined,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for this email, a new verification link has been sent.",
    });
  } catch (error) {
    console.error("[resend-verification] Error:", error);
    return NextResponse.json(
      { message: "Unable to resend verification email right now." },
      { status: 500 },
    );
  }
}
