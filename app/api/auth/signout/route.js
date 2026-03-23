import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";
  logger.info({ requestId }, "User signed out");

  const response = NextResponse.json({ ok: true, message: "Signed out." });

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
