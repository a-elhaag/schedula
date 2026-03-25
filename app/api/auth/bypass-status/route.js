import { NextResponse } from "next/server";
import { DEMO_USERS } from "@/lib/demo-users";

export async function GET(request) {
  const bypassAuth = process.env.BYPASS_AUTH === "true";

  if (!bypassAuth) {
    return NextResponse.json({
      bypassAuthEnabled: false,
      user: null,
    });
  }

  // Get default demo user
  const defaultUserId =
    process.env.BYPASS_AUTH_USER_ID || "666666666666666666666601";
  const defaultRole = process.env.BYPASS_AUTH_USER_ROLE || "coordinator";
  const defaultEmail =
    process.env.BYPASS_AUTH_USER_EMAIL || "coordinator@demo.local";

  return NextResponse.json({
    bypassAuthEnabled: true,
    user: {
      id: defaultUserId,
      email: defaultEmail,
      role: defaultRole,
    },
    demoUsers: DEMO_USERS, // Return all available demo users for reference
  });
}
