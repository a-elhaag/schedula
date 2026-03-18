import { NextResponse } from "next/server";

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

  return NextResponse.json({
    ok: true,
    message: "Email verified successfully. You can now sign in.",
  });
}
