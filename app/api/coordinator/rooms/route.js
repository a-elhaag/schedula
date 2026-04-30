import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorRooms } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";

const VALID_ROOM_TYPES = ["lecture_hall", "tutorial_room", "lab"];
const VALID_LAB_TYPES  = ["computer_lab", "physics_lab", "chemistry_lab", "metal_workshop"];

// ── GET /api/coordinator/rooms ────────────────────────────────────────────────
export const GET = withApiErrorHandling(async function getCoordinatorRoomsRoute(request) {
  try {
    console.log("📤 GET /api/coordinator/rooms - REQUEST");
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { searchParams } = new URL(request.url);

    const building    = searchParams.get("building") ?? undefined;
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit       = Math.min(Math.max(Number.isNaN(parsedLimit) ? 100 : parsedLimit, 0), 500);
    const parsedSkip  = Number.parseInt(searchParams.get("skip") ?? "", 10);
    const skip        = Math.max(Number.isNaN(parsedSkip) ? 0 : parsedSkip, 0);

    console.log("📤 Query params:", { building, limit, skip });
    const iOid       = await resolveInstitutionId(user.institutionId);
    const resolvedId = iOid.toString();

    const result = await getCoordinatorRooms(resolvedId, { building, limit, skip });
    console.log("📥 GET /api/coordinator/rooms - RESPONSE:", result);
    return jsonOk(result);
  } catch (error) {
    console.error("❌ GET /api/coordinator/rooms - ERROR:", error);
    if (error?.status === 400) return jsonError(error.message, 400);
    throw error;
  }
});

// ── POST /api/coordinator/rooms ───────────────────────────────────────────────
export async function POST(request) {
  try {
    console.log("📤 POST /api/coordinator/rooms - REQUEST");
    const { NextResponse } = await import("next/server");
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const body   = await request.json();
    const { name, label, building, room_type, lab_type, groups_capacity } = body;

    console.log("📤 POST body:", { name, label, building, room_type, lab_type, groups_capacity });

    // ── Core field presence ──────────────────────────────────────────────────
    if (!name?.trim() || !label?.trim()) {
      console.log("❌ Validation failed: missing name or label");
      return NextResponse.json({ message: "Room name and label are required." }, { status: 400 });
    }

    // ── room_type ────────────────────────────────────────────────────────────
    if (!room_type || !VALID_ROOM_TYPES.includes(room_type)) {
      console.log("❌ Validation failed: invalid room_type:", room_type);
      return NextResponse.json(
        { message: `room_type must be one of: ${VALID_ROOM_TYPES.join(", ")}.` },
        { status: 400 }
      );
    }

    // ── lab_type (conditional on room_type) ──────────────────────────────────
    let resolvedLabType = null;
    if (room_type === "lab") {
      if (!lab_type || !VALID_LAB_TYPES.includes(lab_type)) {
        console.log("❌ Validation failed: invalid lab_type for lab room:", lab_type);
        return NextResponse.json(
          { message: `lab_type is required for lab rooms and must be one of: ${VALID_LAB_TYPES.join(", ")}.` },
          { status: 400 }
        );
      }
      resolvedLabType = lab_type;
    }

    // ── groups_capacity ──────────────────────────────────────────────────────
    const parsedGroupsCapacity = Number.isInteger(groups_capacity)
      ? groups_capacity
      : Number.parseInt(groups_capacity, 10);

    if (
      !Number.isInteger(parsedGroupsCapacity) ||
      parsedGroupsCapacity < 1 ||
      parsedGroupsCapacity > 10
    ) {
      console.log("❌ Validation failed: invalid groups_capacity:", groups_capacity);
      return NextResponse.json(
        { message: "groups_capacity must be an integer between 1 and 10." },
        { status: 400 }
      );
    }

    // ── Duplicate label check ────────────────────────────────────────────────
    const db = await getDb();

    const existing = await db.collection("rooms").findOne({
      institution_id: iOid,
      label: label.trim().toUpperCase(),
    });
    if (existing) {
      console.log("❌ Duplicate label:", label.trim().toUpperCase());
      return NextResponse.json({ message: "A room with this label already exists." }, { status: 409 });
    }

    // ── Insert ───────────────────────────────────────────────────────────────
    const room = {
      institution_id:  iOid,
      name:            name.trim(),
      label:           label.trim().toUpperCase(),
      building:        building?.trim() ?? "",
      room_type,
      lab_type:        resolvedLabType,
      groups_capacity: parsedGroupsCapacity,
      created_at:      new Date(),
      deleted_at:      null,
    };

    const result = await db.collection("rooms").insertOne(room);
    console.log("📥 POST /api/coordinator/rooms - RESPONSE:", { id: result.insertedId.toString(), ...room });
    return NextResponse.json({ ok: true, room: { id: result.insertedId.toString(), ...room } }, { status: 201 });

  } catch (err) {
    console.error("❌ POST /api/coordinator/rooms - ERROR:", err);
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}