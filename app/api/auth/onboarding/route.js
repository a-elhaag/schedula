import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";

const ROLE_OPTIONS = ["coordinator", "professor", "ta", "student"];

export async function POST(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";
  let body;

  const authToken = request.cookies.get("auth_token")?.value;
  const payload = authToken ? verifyToken(authToken) : null;

  if (!payload || !ROLE_OPTIONS.includes(payload.role)) {
    logger.warn({ requestId }, "Unauthorized onboarding attempt");
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    body = await request.json();
  } catch {
    logger.warn({ requestId }, "Invalid request payload");
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 },
    );
  }

  const role = payload.role;
  const institution =
    typeof body?.institution === "string" ? body.institution.trim() : "";
  const faculty = typeof body?.faculty === "string" ? body.faculty.trim() : "";
  const department =
    typeof body?.department === "string" ? body.department.trim() : "";
  const yearLevel =
    typeof body?.yearLevel === "string" ? body.yearLevel.trim() : "";
  const preferredStart =
    typeof body?.preferredStart === "string" ? body.preferredStart : "";
  const preferredEnd =
    typeof body?.preferredEnd === "string" ? body.preferredEnd : "";

  if (institution.length < 2 || faculty.length < 2 || department.length < 2) {
    return NextResponse.json(
      {
        message:
          "Please complete institution, faculty, and department details.",
      },
      { status: 400 },
    );
  }

  if (role === "student" && !["1", "2", "3", "4"].includes(yearLevel)) {
    return NextResponse.json(
      { message: "Please select your year level." },
      { status: 400 },
    );
  }

  if (!preferredStart || !preferredEnd || preferredStart >= preferredEnd) {
    return NextResponse.json(
      { message: "Preferred start time must be earlier than end time." },
      { status: 400 },
    );
  }

  // Keep a consistent delay to reduce timing differences.
  await new Promise((resolve) => setTimeout(resolve, 320));

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");

    await usersCollection.updateOne(
      { _id: new ObjectId(payload.sub) },
      {
        $set: {
          institution_name: institution,
          faculty_name: faculty,
          department_name: department,
          year_level: role === "student" ? yearLevel : null,
          preferred_start: preferredStart,
          preferred_end: preferredEnd,
          onboarding_completed_at: new Date(),
        },
      },
    );

    logger.info(
      { requestId, userId: payload.sub, role, institution },
      "Onboarding completed",
    );
  } catch (error) {
    logger.error(
      { requestId, userId: payload.sub, error: error.message, stack: error.stack },
      "Onboarding error",
    );
    return NextResponse.json(
      { message: "Unable to save onboarding right now." },
      { status: 500 },
    );
  }

  const redirectByRole = {
    coordinator: "/coordinator/setup",
    professor: "/staff/schedule",
    ta: "/staff/schedule",
    student: "/student/schedule",
  };

  return NextResponse.json({
    ok: true,
    message: "Onboarding completed. Redirecting to your dashboard...",
    redirectTo: redirectByRole[role],
  });
}
