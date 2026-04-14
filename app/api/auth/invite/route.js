import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/server/auth";
import { generateToken } from "@/lib/auth";
import { validateEmail, sendInviteEmail, INVITE_TTL_MS } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { ObjectId } from "mongodb";

const ROLE_OPTIONS = ["professor", "ta", "student"];

function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";
  const clientIp = getClientIp(request);

  // Check rate limit
  const allowed = await checkRateLimit("invite", clientIp);
  if (!allowed) {
    logger.warn(
      { requestId, clientIp },
      "Invite rate limit exceeded",
    );
    return NextResponse.json(
      { message: "Too many invite attempts. Please try again later." },
      { status: 429 },
    );
  }

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

  const email = body?.email ? String(body.email).trim().toLowerCase() : "";
  const role =
    typeof body?.role === "string" ? body.role.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!validateEmail(email)) {
    return NextResponse.json(
      { message: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  if (!ROLE_OPTIONS.includes(role)) {
    return NextResponse.json(
      { message: "Please choose a valid staff or student role." },
      { status: 400 },
    );
  }

  let currentUser;
  try {
    currentUser = getCurrentUser(request, { requiredRole: "coordinator" });
  } catch (err) {
    logger.warn({ requestId }, "Unauthorized invite attempt - coordinator access required");
    return NextResponse.json(
      { message: "Coordinator access required." },
      { status: err.status ?? 401 },
    );
  }

  // Keep a consistent delay to reduce timing differences.
  await new Promise((resolve) => setTimeout(resolve, 320));

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      logger.info({ requestId, email }, "Invite attempted for existing user");
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const inviteToken = generateToken();
    const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const newUser = {
      institution_id: new ObjectId(currentUser.institutionId),
      email,
      password_hash: null,
      role,
      name: name || email.split("@")[0],
      invite_status: "pending",
      invited_by: new ObjectId(currentUser.userId),
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt,
      email_verified_at: null,
      email_verify_token: null,
      email_verify_expires_at: null,
      created_at: new Date(),
    };

    await usersCollection.insertOne(newUser);

    const roleLabel = {
      professor: "Professor",
      ta: "Teaching Assistant",
      student: "Student",
    }[role];

    const emailResult = await sendInviteEmail(
      email,
      inviteToken,
      request,
      roleLabel,
    );

    if (emailResult?.skipped && process.env.NODE_ENV === "production") {
      logger.warn({ requestId, email }, "Invite email send skipped");
      return NextResponse.json(
        { message: "Unable to send invite email right now." },
        { status: 503 },
      );
    }

    logger.info(
      { requestId, email, role, invitedBy: currentUser.userId },
      "Invite created successfully",
    );
    return NextResponse.json(
      {
        ok: true,
        message: "Invite created successfully.",
        inviteToken:
          emailResult?.skipped && process.env.NODE_ENV !== "production"
            ? inviteToken
            : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error(
      { requestId, email, role, error: error.message, stack: error.stack },
      "Invite creation error",
    );
    return NextResponse.json(
      { message: "Unable to create invite right now." },
      { status: 500 },
    );
  }
}
