import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorRooms } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";

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
    const { name, label, building, capacity } = body;

    console.log("📤 POST body:", { name, label, building, capacity });

    if (!name?.trim() || !label?.trim()) {
      console.log("❌ Validation failed: missing name or label");
      return NextResponse.json({ message: "Room name and label are required." }, { status: 400 });
    }

    const db  = await getDb();

    const existing = await db.collection("rooms").findOne({
      institution_id: iOid,
      label: label.trim().toUpperCase(),
    });
    if (existing) {
      console.log("❌ Duplicate label:", label.trim().toUpperCase());
      return NextResponse.json({ message: "A room with this label already exists." }, { status: 409 });
    }

    const room = {
      institution_id: iOid,
      name:           name.trim(),
      label:          label.trim().toUpperCase(),
      building:       building?.trim() ?? "",
      capacity:       parseInt(capacity) || 30,
      created_at:     new Date(),
      deleted_at:     null,
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