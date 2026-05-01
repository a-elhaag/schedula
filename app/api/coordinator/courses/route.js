import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getCoordinatorCourses } from "@/lib/server/coordinatorService";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

// ── GET /api/coordinator/courses ─────────────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get("limit") ?? "100");
    const limit       = Math.min(isNaN(parsedLimit) ? 100 : parsedLimit, 500);
    const skip        = Math.max(parseInt(searchParams.get("skip") ?? "0"), 0);

    const iOid      = await resolveInstitutionId(institutionId);
    const resolvedId = iOid.toString();
    const result     = await getCoordinatorCourses(resolvedId, { limit, skip });

    return NextResponse.json(result);

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/courses ─────────────────────────────────────────────
export async function POST(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const body = await request.json();
    const {
      code, name, credit_hours, level,
      has_lecture, has_tutorial, has_lab, has_tut_lab,
      groups_per_lecture, professor_id, ta_ids,
    } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ message: "Course code and name are required." }, { status: 400 });
    }
    if (!Number.isInteger(Number(level)) || Number(level) < 0) {
      return NextResponse.json({ message: "Valid level is required." }, { status: 400 });
    }
    if (!has_lecture && !has_tutorial && !has_lab && !has_tut_lab) {
      return NextResponse.json({ message: "At least one session type is required." }, { status: 400 });
    }

    const iOid = await resolveInstitutionId(institutionId);
    const db   = await getDb();

    const doc = {
      institution_id:     iOid,
      code:               code.trim().toUpperCase(),
      name:               name.trim(),
      credit_hours:       parseInt(credit_hours) || 3,
      level:              parseInt(level),
      has_lecture:        Boolean(has_lecture),
      has_tutorial:       Boolean(has_tutorial),
      has_lab:            Boolean(has_lab),
      has_tut_lab:        Boolean(has_tut_lab),
      groups_per_lecture: Math.max(1, parseInt(groups_per_lecture) || 1),
      professor_id:       professor_id && ObjectId.isValid(professor_id) ? new ObjectId(professor_id) : null,
      ta_ids:             Array.isArray(ta_ids) ? ta_ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) : [],
      created_at:         new Date(),
      deleted_at:         null,
    };

    const result = await db.collection("courses").insertOne(doc);
    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
