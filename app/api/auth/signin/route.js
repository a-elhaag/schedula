import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { comparePassword } from "@/lib/password";
import { validateEmail } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";

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

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!validateEmail(email)) {
    return NextResponse.json(
      { message: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  if (!password) {
    return NextResponse.json(
      { message: "Please provide a password." },
      { status: 400 },
    );
  }

  // Consistent delay to reduce timing attacks
  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");

    // Find user by email
    const user = await usersCollection.findOne({ email });

    if (!user) {
      // User not found — return generic error to prevent email enumeration
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Check if user has joined and verified email
    if (user.invite_status !== "joined" || !user.email_verified_at) {
      return NextResponse.json(
        {
          message:
            "Your account is not yet activated. Please verify your email.",
        },
        { status: 403 },
      );
    }

    // Verify password against hash
    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Generate JWT token (30-minute TTL)
    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      institution: user.institution_id.toString(),
    });

    const redirectByRole = {
      coordinator: "/coordinator/setup",
      professor: "/staff/schedule",
      ta: "/staff/schedule",
      student: "/student/schedule",
    };

    // Create response with httpOnly cookie
    const response = NextResponse.json(
      {
        ok: true,
        user: { id: user._id.toString(), email: user.email, role: user.role },
        redirectTo: redirectByRole[user.role] ?? "/signin",
      },
      { status: 200 },
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    logger.info({ requestId, userId: user._id.toString() }, "Sign in successful");
    return response;
  } catch (error) {
    logger.error(
      { requestId, error: error.message, stack: error.stack },
      "Sign in error",
    );
    return NextResponse.json(
      { message: "An error occurred during sign in." },
      { status: 500 },
    );
  }
}
