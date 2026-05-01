import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid course ID." }, { status: 400 });
    }

    const body = await request.json();
    const {
      code, name, credit_hours, level,
      has_lecture, has_tutorial, has_lab, has_tut_lab,
      groups_per_lecture, professor_id, ta_ids,
    } = body;

    const iOid = await resolveInstitutionId(institutionId);
    const db   = await getDb();

    const $set = { updated_at: new Date() };
    if (code !== undefined)               $set.code               = code.trim().toUpperCase();
    if (name !== undefined)               $set.name               = name.trim();
    if (credit_hours !== undefined)       $set.credit_hours       = parseInt(credit_hours) || 3;
    if (level !== undefined)              $set.level              = parseInt(level);
    if (has_lecture !== undefined)        $set.has_lecture        = Boolean(has_lecture);
    if (has_tutorial !== undefined)       $set.has_tutorial       = Boolean(has_tutorial);
    if (has_lab !== undefined)            $set.has_lab            = Boolean(has_lab);
    if (has_tut_lab !== undefined)        $set.has_tut_lab        = Boolean(has_tut_lab);
    if (groups_per_lecture !== undefined) $set.groups_per_lecture = Math.max(1, parseInt(groups_per_lecture) || 1);
    if (professor_id !== undefined)       $set.professor_id       = professor_id && ObjectId.isValid(professor_id) ? new ObjectId(professor_id) : null;
    if (ta_ids !== undefined)             $set.ta_ids             = Array.isArray(ta_ids) ? ta_ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) : [];

    const result = await db.collection("courses").updateOne(
      { _id: new ObjectId(id), institution_id: iOid, deleted_at: null },
      { $set }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid course ID." }, { status: 400 });
    }

    const iOid = await resolveInstitutionId(institutionId);
    const db   = await getDb();

    const result = await db.collection("courses").updateOne(
      { _id: new ObjectId(id), institution_id: iOid, deleted_at: null },
      { $set: { deleted_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
