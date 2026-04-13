import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

// ── GET /api/coordinator/assign ──────────────────────────────────────────────
// Returns all courses (with assigned_staff) and all staff for the institution.
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid = await resolveInstitutionId(institutionId);
    const db   = await getDb();

    const [courses, staff] = await Promise.all([
      db.collection("courses")
        .find({ institution_id: iOid, deleted_at: null })
        .sort({ code: 1 })
        .project({ code: 1, name: 1, credit_hours: 1, sections: 1, assigned_staff: 1 })
        .toArray(),
      db.collection("users")
        .find({ institution_id: iOid, deleted_at: null, role: { $in: ["professor", "ta"] } })
        .sort({ name: 1 })
        .project({ name: 1, email: 1, role: 1 })
        .toArray(),
    ]);

    // Build a set of all assigned staff IDs across all courses (for workload display)
    const assignmentCount = {};
    for (const c of courses) {
      for (const sid of c.assigned_staff ?? []) {
        const key = sid.toString();
        assignmentCount[key] = (assignmentCount[key] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      courses: courses.map(c => ({
        id:            c._id.toString(),
        code:          c.code,
        name:          c.name,
        creditHours:   c.credit_hours ?? 3,
        sections:      c.sections ?? 1,
        assignedStaff: (c.assigned_staff ?? []).map(id => id.toString()),
      })),
      staff: staff.map(s => ({
        id:          s._id.toString(),
        name:        s.name,
        email:       s.email,
        role:        s.role,
        assignments: assignmentCount[s._id.toString()] ?? 0,
      })),
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── PUT /api/coordinator/assign ──────────────────────────────────────────────
// Assigns or unassigns a staff member from a course.
// Body: { courseId, staffId, action: "assign" | "unassign" }
export async function PUT(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid = await resolveInstitutionId(institutionId);
    const db   = await getDb();

    const body = await request.json();
    const { courseId, staffId, action } = body;

    if (!courseId || !ObjectId.isValid(courseId)) {
      return NextResponse.json({ message: "Invalid courseId" }, { status: 400 });
    }
    if (!staffId || !ObjectId.isValid(staffId)) {
      return NextResponse.json({ message: "Invalid staffId" }, { status: 400 });
    }
    if (!["assign", "unassign"].includes(action)) {
      return NextResponse.json({ message: "action must be 'assign' or 'unassign'" }, { status: 400 });
    }

    // Verify course belongs to this institution
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
      institution_id: iOid,
      deleted_at: null,
    });
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    // Verify staff belongs to this institution
    const staffMember = await db.collection("users").findOne({
      _id: new ObjectId(staffId),
      institution_id: iOid,
      deleted_at: null,
      role: { $in: ["professor", "ta"] },
    });
    if (!staffMember) {
      return NextResponse.json({ message: "Staff member not found" }, { status: 404 });
    }

    const staffOid = new ObjectId(staffId);
    const update = action === "assign"
      ? { $addToSet: { assigned_staff: staffOid } }
      : { $pull:     { assigned_staff: staffOid } };

    await db.collection("courses").updateOne(
      { _id: new ObjectId(courseId) },
      update,
    );

    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
