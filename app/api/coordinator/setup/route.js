import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";

// ── GET /api/coordinator/setup ────────────────────────────────────────────────
export async function GET(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();

    const institution = await db.collection("institutions").findOne({ _id: iOid });
    if (!institution) {
      return NextResponse.json({ institution: null, isComplete: false });
    }

    const isComplete = !!(
      institution.name &&
      institution.active_term?.label &&
      institution.settings?.daily_start
    );

    return NextResponse.json({ institution, isComplete });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/setup ───────────────────────────────────────────────
export async function POST(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();
    const body   = await request.json();

    const {
      institutionName,
      slug,
      termLabel,
      termStart,
      termEnd,
      workingDays,
      dailyStart,
      dailyEnd,
      slotDuration,
      maxConsecutive,
    } = body;

    if (!institutionName?.trim()) {
      return NextResponse.json({ message: "Institution name is required." }, { status: 400 });
    }

    await db.collection("institutions").updateOne(
      { _id: iOid },
      {
        $set: {
          name: institutionName.trim(),
          slug: slug?.trim() ?? institutionName.trim().toLowerCase().replace(/\s+/g, "-"),
          active_term: {
            label:        termLabel   ?? "Spring 2026",
            start_date:   termStart   ?? "",
            end_date:     termEnd     ?? "",
            working_days: Array.isArray(workingDays) ? workingDays : [],
          },
          settings: {
            slot_duration_minutes:  parseInt(slotDuration)    || 60,
            daily_start:            dailyStart                ?? "08:00",
            daily_end:              dailyEnd                  ?? "17:00",
            max_consecutive_slots:  parseInt(maxConsecutive)  || 4,
          },
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, message: "Institution setup saved successfully." });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}