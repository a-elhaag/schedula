import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function GET(request) {
  const authToken = request.cookies.get("auth_token")?.value;
  const payload = authToken ? verifyToken(authToken) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      institution: payload.institution,
    },
  });
}
