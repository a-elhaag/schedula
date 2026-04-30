import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { updateCourse, deleteCourse } from "@/lib/server/coordinatorService";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── PUT /api/coordinator/courses/[id] ─────────────────────────────────────────
export async function PUT(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "Course ID is required." }, { status: 400 });
    }

    const body = await request.json();

    if (body.year_levels !== undefined) {
      if (!Array.isArray(body.year_levels) || body.year_levels.length === 0) {
        return NextResponse.json({ message: "At least one year level must be selected." }, { status: 400 });
      }
    }

    if (body.section_types !== undefined) {
      if (!Array.isArray(body.section_types) || body.section_types.length === 0) {
        return NextResponse.json({ message: "At least one section type must be selected." }, { status: 400 });
      }
      const validSectionTypes = body.section_types.every(st =>
        ["lecture", "lab", "tutorial"].includes(st.type) &&
        typeof st.duration_minutes === "number" &&
        st.duration_minutes > 0
      );
      if (!validSectionTypes) {
        return NextResponse.json({ message: "Invalid section type or duration." }, { status: 400 });
      }
    }

    const iOid = await resolveInstitutionId(institutionId);

    const course = await updateCourse(iOid.toString(), id, body);
    return NextResponse.json({ ok: true, course });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

// ── DELETE /api/coordinator/courses/[id] ──────────────────────────────────────
export async function DELETE(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "Course ID is required." }, { status: 400 });
    }

    const iOid = await resolveInstitutionId(institutionId);
    const success = await deleteCourse(iOid.toString(), id);

    if (!success) {
      return NextResponse.json({ message: "Course not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}
