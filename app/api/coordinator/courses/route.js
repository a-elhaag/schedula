import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getCoordinatorCourses, createCourse } from "@/lib/server/coordinatorService";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── GET /api/coordinator/courses ─────────────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const { searchParams } = new URL(request.url);
    const departmentId   = searchParams.get("departmentId") ?? undefined;
    const termLabel      = searchParams.get("termLabel") ?? undefined;
    const parsedLimit    = parseInt(searchParams.get("limit") ?? "100");
    const limit          = Math.min(isNaN(parsedLimit) ? 100 : parsedLimit, 500);
    const skip           = Math.max(parseInt(searchParams.get("skip") ?? "0"), 0);

    const iOid      = await resolveInstitutionId(institutionId);
    const resolvedId = iOid.toString();
    
    // Fetch courses with real enrollment data (termLabel optional)
    const result     = await getCoordinatorCourses(resolvedId, { 
      departmentId, 
      termLabel,
      limit, 
      skip 
    });

    return NextResponse.json(result);

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