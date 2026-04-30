import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { updateRoom, deleteRoom } from "@/lib/server/coordinatorService";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── PUT /api/coordinator/rooms/[id] ─────────────────────────────────────────
export async function PUT(request, { params }) {
  try {
    console.log("📤 PUT /api/coordinator/rooms/[id] - REQUEST");
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    console.log("📤 Room ID:", id);
    if (!id) {
      console.log("❌ Missing room ID");
      return NextResponse.json({ message: "Room ID is required." }, { status: 400 });
    }

    const body = await request.json();
    console.log("📤 PUT body:", body);
    const iOid = await resolveInstitutionId(institutionId);

    const room = await updateRoom(iOid.toString(), id, body);
    console.log("📥 PUT /api/coordinator/rooms/[id] - RESPONSE:", room);
    return NextResponse.json({ ok: true, room });

  } catch (err) {
    console.error("❌ PUT /api/coordinator/rooms/[id] - ERROR:", err);
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

// ── DELETE /api/coordinator/rooms/[id] ──────────────────────────────────────
export async function DELETE(request, { params }) {
  try {
    console.log("📤 DELETE /api/coordinator/rooms/[id] - REQUEST");
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    console.log("📤 Room ID:", id);
    if (!id) {
      console.log("❌ Missing room ID");
      return NextResponse.json({ message: "Room ID is required." }, { status: 400 });
    }

    const iOid = await resolveInstitutionId(institutionId);
    const success = await deleteRoom(iOid.toString(), id);

    if (!success) {
      console.log("❌ Room not found:", id);
      return NextResponse.json({ message: "Room not found or already deleted." }, { status: 404 });
    }

    console.log("📥 DELETE /api/coordinator/rooms/[id] - RESPONSE: SUCCESS");
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("❌ DELETE /api/coordinator/rooms/[id] - ERROR:", err);
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}
