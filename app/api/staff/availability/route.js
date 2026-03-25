import { getDb } from "../../../../lib/db";
import { ObjectId } from "mongodb";
import { createHash } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";

function computeAvailabilityHash(slots) {
  const sorted = [...slots].sort((a, b) =>
    `${a.day}${a.slot}`.localeCompare(`${b.day}${b.slot}`),
  );
  return createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex")
    .slice(0, 16);
}

/**
 * GET  /api/staff/availability?userId=xxx
 *   Returns the staff member's info + previously saved availability slots.
 *
 * POST /api/staff/availability
 *   Body: { userId, slots: [{ day, slot }] }
 *   Saves (upserts) availability for the current term.
 */

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    // Skip auth check if BYPASS_AUTH is enabled
    if (process.env.BYPASS_AUTH !== "true") {
      const authUser = getCurrentUser(request, {
        requiredRole: ["professor", "ta", "coordinator"],
      });
      if (authUser.role !== "coordinator" && authUser.userId !== userId) {
        return Response.json(
          { error: "Forbidden. Can only view your own availability." },
          { status: 403 },
        );
      }
    }

    const db = await getDb();

    // Get staff user
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
      role: { $in: ["professor", "ta"] },
    });

    if (!user) {
      return Response.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    // Get institution → active term label
    const institution = await db.collection("institutions").findOne({
      _id: user.institution_id,
    });
    const termLabel = institution?.active_term?.label ?? "Spring 2026";

    // Get existing availability if any
    const existing = await db.collection("availability").findOne({
      user_id: user._id,
      term_label: termLabel,
    });

    return Response.json({
      staff: {
        name: user.name,
        role: capitalise(user.role),
        email: user.email,
      },
      term: termLabel,
      slots: existing?.slots ?? [],
      submitted: !!existing,
      versionHash: existing?.version_hash ?? null,
    });
  } catch (err) {
    console.error("[staff/availability GET] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, slots } = body;

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    // Skip auth check if BYPASS_AUTH is enabled
    if (process.env.BYPASS_AUTH !== "true") {
      const authUser = getCurrentUser(request, {
        requiredRole: ["professor", "ta", "coordinator"],
      });
      if (authUser.role !== "coordinator" && authUser.userId !== userId) {
        return Response.json(
          { error: "Forbidden. Can only update your own availability." },
          { status: 403 },
        );
      }
    }

    if (!Array.isArray(slots)) {
      return Response.json(
        { error: "slots must be an array" },
        { status: 400 },
      );
    }

    const db = await getDb();

    // Verify user is staff
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
      role: { $in: ["professor", "ta"] },
    });

    if (!user) {
      return Response.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    // Get active term
    const institution = await db.collection("institutions").findOne({
      _id: user.institution_id,
    });
    const termLabel = institution?.active_term?.label ?? "Spring 2026";

    // Validate slots — each must have { day, slot }
    const validDays = [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
    ];
    const validSlots = [
      "07:00",
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ];

    const cleanSlots = slots.filter(
      (s) => validDays.includes(s.day) && validSlots.includes(s.slot),
    );

    const versionHash = computeAvailabilityHash(cleanSlots);

    // Upsert availability document
    await db.collection("availability").updateOne(
      {
        user_id: user._id,
        institution_id: user.institution_id,
        term_label: termLabel,
      },
      {
        $set: {
          user_id: user._id,
          institution_id: user.institution_id,
          term_label: termLabel,
          slots: cleanSlots,
          version_hash: versionHash,
          submitted_at: new Date(),
          updated_at: new Date(),
        },
      },
      { upsert: true },
    );

    return Response.json({
      success: true,
      term: termLabel,
      slotCount: cleanSlots.length,
      message: "Availability saved successfully",
      versionHash,
    });
  } catch (err) {
    console.error("[staff/availability POST] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
