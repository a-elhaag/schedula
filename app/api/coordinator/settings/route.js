import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

// ── GET /api/coordinator/settings ────────────────────────────────────────────
export async function GET(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const db     = await getDb();

    // Get coordinator user profile
    let profile = { name: "", email: "" };
    if (ObjectId.isValid(user.userId)) {
      const dbUser = await db.collection("users").findOne(
        { _id: new ObjectId(user.userId) },
        { projection: { name:1, email:1 } }
      );
      if (dbUser) profile = { name: dbUser.name ?? "", email: dbUser.email ?? "" };
    }

    // Get saved settings
    const iOid    = await resolveInstitutionId(user.institutionId);
    const settings = await db.collection("users").findOne(
      { _id: new ObjectId(user.userId) },
      { projection: { coordinator_settings:1 } }
    );

    const saved = settings?.coordinator_settings ?? {};

    return NextResponse.json({
      profile,
      notifs: saved.notifs ?? {
        email_on_publish:      true,
        email_on_conflict:     true,
        email_on_availability: false,
      },
      prefs: saved.prefs ?? {
        show_room_labels:      true,
        compact_schedule:      false,
        auto_detect_conflicts: true,
      },
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/settings ───────────────────────────────────────────
export async function POST(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const db     = await getDb();
    const body   = await request.json();
    const { section, profile, notifs, prefs } = body;

    if (!ObjectId.isValid(user.userId)) {
      return NextResponse.json({ message: "Invalid user session." }, { status: 400 });
    }

    const uid = new ObjectId(user.userId);

    if (section === "profile" && profile) {
      await db.collection("users").updateOne(
        { _id: uid },
        { $set: { name: profile.name?.trim(), updated_at: new Date() } }
      );
    }

    if (section === "notifs" && notifs) {
      await db.collection("users").updateOne(
        { _id: uid },
        { $set: { "coordinator_settings.notifs": notifs, updated_at: new Date() } }
      );
    }

    if (section === "prefs" && prefs) {
      await db.collection("users").updateOne(
        { _id: uid },
        { $set: { "coordinator_settings.prefs": prefs, updated_at: new Date() } }
      );
    }

    return NextResponse.json({ ok: true, message: "Settings saved successfully." });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}