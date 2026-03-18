import { NextResponse } from "next/server";

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
      { status: 400 }
    );
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (token.length < TOKEN_MIN_LENGTH) {
    return NextResponse.json(
      { message: "This password reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 });
  }

  // Keep a consistent delay to reduce timing differences.
  await new Promise((resolve) => setTimeout(resolve, 350));

  return NextResponse.json({
    ok: true,
    message: "Your password has been reset successfully. You can sign in now.",
  });
}
