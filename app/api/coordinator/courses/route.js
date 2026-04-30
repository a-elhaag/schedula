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
    const { code, name, credit_hours, num_sections, sections, year_levels, section_types } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ message: "Course code and name are required." }, { status: 400 });
    }

    if (!Array.isArray(year_levels) || year_levels.length === 0) {
      return NextResponse.json({ message: "At least one year level must be selected." }, { status: 400 });
    }

    if (!Array.isArray(section_types) || section_types.length === 0) {
      return NextResponse.json({ message: "At least one section type must be selected." }, { status: 400 });
    }

    const validSectionTypes = section_types.every(st =>
      ["lecture", "lab", "tutorial"].includes(st.type) &&
      typeof st.duration_minutes === "number" &&
      st.duration_minutes > 0
    );

    if (!validSectionTypes) {
      return NextResponse.json({ message: "Invalid section type or duration." }, { status: 400 });
    }

    const iOid       = await resolveInstitutionId(institutionId);
    const resolvedId  = iOid.toString();
    const course      = await createCourse(resolvedId, {
      code:         code.trim().toUpperCase(),
      name:         name.trim(),
      credit_hours: parseInt(credit_hours) || 3,
      num_sections: parseInt(num_sections || sections) || 1,
      year_levels:  year_levels.filter(y => [1, 2, 3, 4].includes(Number(y))).map(Number),
      section_types,
    });

    return NextResponse.json({ ok: true, course }, { status: 201 });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}