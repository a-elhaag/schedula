import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── GET /api/coordinator/groups ──────────────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const db   = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    const settings = await db.collection("settings").findOne({
      institution_id: iOid,
      type: "levels_config",
    });

    const levels = settings?.data?.levels ?? [];
    return NextResponse.json({ levels });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── PUT /api/coordinator/groups ──────────────────────────────────────────────
// Body: { levels: [{ level, label, groups: [{ group_id, subgroup_count }] }] }
export async function PUT(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const body = await request.json();
    const { levels } = body;

    if (!Array.isArray(levels) || levels.length === 0) {
      return NextResponse.json({ message: "levels array is required." }, { status: 400 });
    }

    for (const lv of levels) {
      if (!Number.isInteger(lv.level) || lv.level < 0) {
        return NextResponse.json({ message: `Invalid level number: ${lv.level}` }, { status: 400 });
      }
      if (!Array.isArray(lv.groups)) {
        return NextResponse.json({ message: `Level ${lv.level} must have a groups array.` }, { status: 400 });
      }
      for (const g of lv.groups) {
        if (!g.group_id || typeof g.group_id !== "string") {
          return NextResponse.json({ message: "Each group must have a group_id string." }, { status: 400 });
        }
        if (!Number.isInteger(g.subgroup_count) || g.subgroup_count < 0) {
          return NextResponse.json({ message: `Invalid subgroup_count for group ${g.group_id}` }, { status: 400 });
        }
      }
    }

    const db   = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    await db.collection("settings").updateOne(
      { institution_id: iOid, type: "levels_config" },
      {
        $set: {
          institution_id: iOid,
          type: "levels_config",
          data: { levels },
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, levels });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
