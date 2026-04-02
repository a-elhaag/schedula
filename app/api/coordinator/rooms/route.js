import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCoordinatorRooms } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";

// ── GET /api/coordinator/rooms ────────────────────────────────────────────────
export const GET = withApiErrorHandling(async function getCoordinatorRoomsRoute(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { searchParams } = new URL(request.url);

    const building    = searchParams.get("building") ?? undefined;
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit       = Math.min(Math.max(Number.isNaN(parsedLimit) ? 100 : parsedLimit, 0), 500);
    const parsedSkip  = Number.parseInt(searchParams.get("skip") ?? "", 10);
    const skip        = Math.max(Number.isNaN(parsedSkip) ? 0 : parsedSkip, 0);

    const iOid       = await resolveInstitutionId(user.institutionId);
    const resolvedId = iOid.toString();

    const result = await getCoordinatorRooms(resolvedId, { building, limit, skip });
    return jsonOk(result);
  } catch (error) {
    if (error?.status === 400) return jsonError(error.message, 400);
    throw error;
  }
});

// ── POST /api/coordinator/rooms ───────────────────────────────────────────────
export async function POST(request) {
  try {
    const { NextResponse } = await import("next/server");
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const body   = await request.json();
    const { name, label, building, capacity } = body;

    if (!name?.trim() || !label?.trim()) {
      return NextResponse.json({ message: "Room name and label are required." }, { status: 400 });
    }

    const db  = await getDb();

    const existing = await db.collection("rooms").findOne({
      institution_id: iOid,
      label: label.trim().toUpperCase(),
    });
    if (existing) {
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
    return NextResponse.json({ ok: true, room: { id: result.insertedId.toString(), ...room } }, { status: 201 });

  } catch (err) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}