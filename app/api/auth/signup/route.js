import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { generateToken } from "@/lib/auth";
import { buildEmailTemplate, getBaseUrl, sendEmail } from "@/lib/email";
import { ObjectId } from "mongodb";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_INSTITUTION_ID = "69b538e5aa373449d761b122"; // Software Engineering Department
const EMAIL_VERIFY_TTL_HOURS = 24;

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

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (name.length < 2) {
    return NextResponse.json(
      { message: "Please provide your full name." },
      { status: 400 },
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { message: "Please provide a valid email address." },
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

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    const emailVerifyToken = generateToken();
    const emailVerifyExpiresAt = new Date(
      Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000,
    );

    // Create user document
    const newUser = {
      institution_id: new ObjectId(DEFAULT_INSTITUTION_ID),
      email,
      password_hash: passwordHash,
      role: "coordinator", // Coordinator-only signup
      name,
      invite_status: "pending", // User must verify email
      email_verify_token: emailVerifyToken,
      email_verify_expires_at: emailVerifyExpiresAt,
      email_verified_at: null,
      invited_by: null,
      invite_token: null,
      invite_expires_at: null,
      created_at: new Date(),
    };

    // Insert user into database
    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId.toString();

    const baseUrl = getBaseUrl(request);
    const verificationLink = `${baseUrl}/verify-email?token=${encodeURIComponent(
      emailVerifyToken,
    )}&email=${encodeURIComponent(email)}`;

    const template = buildEmailTemplate({
      type: "verify",
      actionUrl: verificationLink,
    });

    const emailResult = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    if (emailResult?.skipped && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { message: "Unable to send verification email right now." },
        { status: 503 },
      );
    }

    // Create response
    const response = NextResponse.json(
      {
        ok: true,
        message: "Account created. Please verify your email to continue.",
        user: { id: userId, email, role: "coordinator" },
        verificationToken:
          emailResult?.skipped && process.env.NODE_ENV !== "production"
            ? emailVerifyToken
            : undefined,
      },
      { status: 201 },
    );

    return response;
  } catch (error) {
    console.error("[signup] Error:", error);
    return NextResponse.json(
      { message: "An error occurred during sign up." },
      { status: 500 },
    );
  }
}
