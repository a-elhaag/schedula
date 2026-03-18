import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";
import { ObjectId } from "mongodb";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_INSTITUTION_ID = "69b538e5aa373449d761b122"; // Software Engineering Department

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

    // Create user document
    const newUser = {
      institution_id: new ObjectId(DEFAULT_INSTITUTION_ID),
      email,
      password_hash: passwordHash,
      role: "student", // Default role on signup
      name,
      invite_status: "pending", // User must verify email
      created_at: new Date(),
    };

    // Insert user into database
    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId.toString();

    // Generate JWT token (will be used after email verification)
    const token = signToken({
      sub: userId,
      email,
      role: "student",
      institution: DEFAULT_INSTITUTION_ID,
    });

    // Create response
    const response = NextResponse.json(
      {
        ok: true,
        message: "Account created. Please verify your email to continue.",
        user: { id: userId, email, role: "student" },
      },
      { status: 201 },
    );

    // Set JWT cookie (will be valid after email verification)
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[signup] Error:", error);
    return NextResponse.json(
      { message: "An error occurred during sign up." },
      { status: 500 },
    );
  }
}
