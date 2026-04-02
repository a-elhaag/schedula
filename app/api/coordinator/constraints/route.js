import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";

// ── GET /api/coordinator/constraints ─────────────────────────────────────────
export async function GET(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();

    const doc = await db.collection("constraints").findOne({
      institution_id: iOid,
    });

    // Return saved constraints or empty object (page uses defaults)
    return NextResponse.json({
      hard: doc?.hard ?? {},
      soft: doc?.soft ?? {},
      updatedAt: doc?.updated_at ?? null,
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/constraints ────────────────────────────────────────
export async function POST(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();
    const body   = await request.json();
    const { hard, soft } = body;

    await db.collection("constraints").updateOne(
      { institution_id: iOid },
      {
        $set: {
          institution_id: iOid,
          hard:           hard ?? {},
          soft:           soft ?? {},
          updated_at:     new Date(),
          updated_by:     user.userId,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, message: "Constraints saved successfully." });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}