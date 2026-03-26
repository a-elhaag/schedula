import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getCoordinatorCourses, createCourse } from "@/lib/server/coordinatorService";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── GET /api/coordinator/courses ─────────────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const skip  = parseInt(searchParams.get("skip")  ?? "0");

    const iOid      = await resolveInstitutionId(institutionId);
    const resolvedId = iOid.toString();
    const result     = await getCoordinatorCourses(resolvedId, { limit, skip });

    // Add mock fill rate for now (real data needs enrollment tracking)
    const items = result.items.map(c => ({
      ...c,
      fillRate: Math.floor(60 + Math.random() * 35), // replace with real enrollment data
    }));

    return NextResponse.json({ ...result, items });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

// ── POST /api/coordinator/courses ─────────────────────────────────────────────
export async function POST(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const body = await request.json();
    const { code, name, credit_hours, sections } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ message: "Course code and name are required." }, { status: 400 });
    }

    const iOid       = await resolveInstitutionId(institutionId);
    const resolvedId  = iOid.toString();
    const course      = await createCourse(resolvedId, {
      code:         code.trim().toUpperCase(),
      name:         name.trim(),
      credit_hours: parseInt(credit_hours) || 3,
      sections:     parseInt(sections)     || 1,
    });

    return NextResponse.json({ ok: true, course }, { status: 201 });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}