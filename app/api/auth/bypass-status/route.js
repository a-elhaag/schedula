import { NextResponse } from "next/server";
import { DEV_USER } from "@/lib/demo-users";

export async function GET() {
  const devMode = process.env.DEV_MODE === "true";

  if (!devMode) {
    return NextResponse.json({ devMode: false, user: null });
  }

  return NextResponse.json({
    devMode: true,
    user: {
      id: DEV_USER.id,
      email: DEV_USER.email,
      role: DEV_USER.role,
    },
  });
}
