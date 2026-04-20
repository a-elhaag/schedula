import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { 
  getEnrollment, 
  upsertEnrollment, 
  deleteEnrollment 
} from "@/lib/server/coordinatorService";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

/**
 * GET /api/coordinator/enrollments?courseId=<id>&termLabel=<label>
 * Fetch enrollment data for a course
 */
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const termLabel = searchParams.get("termLabel");

    if (!courseId || !termLabel) {
      return NextResponse.json(
        { message: "courseId and termLabel are required" },
        { status: 400 }
      );
    }

    const resolvedInstitutionId = await resolveInstitutionId(institutionId);
    const enrollment = await getEnrollment(
      resolvedInstitutionId.toString(),
      courseId,
      termLabel
    );

    if (!enrollment) {
      return NextResponse.json(
        { 
          message: "No enrollment found", 
          enrollment: null 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ enrollment });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

/**
 * POST /api/coordinator/enrollments
 * Create or update enrollment for a course
 * 
 * Body: {
 *   courseId: string,
 *   termLabel: string,
 *   enrolledStudents: number,
 *   capacity: number
 * }
 */
export async function POST(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const body = await request.json();
    const { courseId, termLabel, enrolledStudents, capacity } = body;

    if (!courseId || !termLabel) {
      return NextResponse.json(
        { message: "courseId and termLabel are required" },
        { status: 400 }
      );
    }

    if (typeof enrolledStudents !== "number" || enrolledStudents < 0) {
      return NextResponse.json(
        { message: "enrolledStudents must be a non-negative number" },
        { status: 400 }
      );
    }

    if (typeof capacity !== "number" || capacity <= 0) {
      return NextResponse.json(
        { message: "capacity must be a positive number" },
        { status: 400 }
      );
    }

    const resolvedInstitutionId = await resolveInstitutionId(institutionId);
    const result = await upsertEnrollment(
      resolvedInstitutionId.toString(),
      courseId,
      termLabel,
      enrolledStudents,
      capacity
    );

    return NextResponse.json(
      { 
        ok: true, 
        message: result.created ? "Enrollment created" : "Enrollment updated",
        enrollment: {
          courseId,
          termLabel,
          enrolledStudents: result.enrolledStudents,
          capacity: result.capacity,
          fillRate: result.fillRate,
        }
      },
      { status: result.created ? 201 : 200 }
    );

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

/**
 * DELETE /api/coordinator/enrollments?courseId=<id>&termLabel=<label>
 * Soft delete enrollment record
 */
export async function DELETE(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const termLabel = searchParams.get("termLabel");

    if (!courseId || !termLabel) {
      return NextResponse.json(
        { message: "courseId and termLabel are required" },
        { status: 400 }
      );
    }

    const resolvedInstitutionId = await resolveInstitutionId(institutionId);
    const deleted = await deleteEnrollment(
      resolvedInstitutionId.toString(),
      courseId,
      termLabel
    );

    if (!deleted) {
      return NextResponse.json(
        { message: "Enrollment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: "Enrollment deleted" });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}
