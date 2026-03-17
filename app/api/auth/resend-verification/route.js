import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { message: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  // Keep a consistent delay to avoid account-enumeration timing signals.
  await new Promise((resolve) => setTimeout(resolve, 300));

  return NextResponse.json({
    ok: true,
    message: "If an account exists for this email, a new verification link has been sent.",
  });
}
