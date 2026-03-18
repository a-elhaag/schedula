import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { buildEmailTemplate, getBaseUrl, sendEmail } from "@/lib/email";

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

    if (user) {
      const passwordResetToken = generateToken();
      const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            password_reset_token: passwordResetToken,
            password_reset_expires_at: passwordResetExpiresAt,
          },
        },
      );

      const baseUrl = getBaseUrl(request);
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(
        passwordResetToken,
      )}`;

      const template = buildEmailTemplate({
        type: "reset",
        actionUrl: resetLink,
      });

      const emailResult = await sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      if (emailResult?.skipped && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { message: "Unable to send reset email right now." },
          { status: 503 },
        );
      }

      return NextResponse.json({
        ok: true,
        message:
          "If an account exists for this email, a password reset link has been sent.",
        resetToken:
          emailResult?.skipped && process.env.NODE_ENV !== "production"
            ? passwordResetToken
            : undefined,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    return NextResponse.json(
      { message: "Unable to process password reset right now." },
      { status: 500 },
    );
  }
}
