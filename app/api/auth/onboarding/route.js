import { NextResponse } from "next/server";

const ROLE_OPTIONS = ["coordinator", "professor", "ta", "student"];

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

  const role = typeof body?.role === "string" ? body.role.trim().toLowerCase() : "";
  const institution = typeof body?.institution === "string" ? body.institution.trim() : "";
  const faculty = typeof body?.faculty === "string" ? body.faculty.trim() : "";
  const department = typeof body?.department === "string" ? body.department.trim() : "";
  const yearLevel = typeof body?.yearLevel === "string" ? body.yearLevel.trim() : "";
  const preferredStart = typeof body?.preferredStart === "string" ? body.preferredStart : "";
  const preferredEnd = typeof body?.preferredEnd === "string" ? body.preferredEnd : "";

  if (!ROLE_OPTIONS.includes(role)) {
    return NextResponse.json({ message: "Please choose a valid role." }, { status: 400 });
  }

  if (institution.length < 2 || faculty.length < 2 || department.length < 2) {
    return NextResponse.json(
      { message: "Please complete institution, faculty, and department details." },
      { status: 400 }
    );
  }

  if (role === "student" && !["1", "2", "3", "4"].includes(yearLevel)) {
    return NextResponse.json({ message: "Please select your year level." }, { status: 400 });
  }

  if (!preferredStart || !preferredEnd || preferredStart >= preferredEnd) {
    return NextResponse.json(
      { message: "Preferred start time must be earlier than end time." },
      { status: 400 }
    );
  }

  // Keep a consistent delay to reduce timing differences.
  await new Promise((resolve) => setTimeout(resolve, 320));

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
