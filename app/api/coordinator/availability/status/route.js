import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";

// ── GET /api/coordinator/availability/status ──────────────────────────────────
export async function GET(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();

    // Get institution active term
    const institution = await db.collection("institutions").findOne({ _id: iOid });
    const termLabel   = institution?.active_term?.label ?? "Spring 2026";

    // Get all staff
    const staff = await db.collection("users").find({
      institution_id: iOid,
      role:           { $in: ["professor", "ta"] },
      deleted_at:     null,
    }).sort({ name: 1 }).toArray();

    // Get all availability submissions for this term
    const submissions = await db.collection("availability").find({
      institution_id: iOid,
      term_label:     termLabel,
    }).toArray();

    const submissionMap = Object.fromEntries(
      submissions.map(s => [s.user_id.toString(), s])
    );

    const enriched = staff.map(s => {
      const sub = submissionMap[s._id.toString()];
      return {
        id:        s._id.toString(),
        name:      s.name,
        email:     s.email,
        role:      s.role,
        status:    sub ? "submitted" : "missing",
        slotCount: sub?.slots?.length ?? 0,
        slots:     sub?.slots ?? [],
        submittedAt: sub?.submitted_at ?? null,
      };
    });

    const submitted = enriched.filter(s => s.status === "submitted").length;
    const coverage  = staff.length ? Math.round((submitted / staff.length) * 100) : 0;

    return NextResponse.json({
      term:      termLabel,
      staff:     enriched,
      stats:     { total: staff.length, submitted, missing: staff.length - submitted, coverage },
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}