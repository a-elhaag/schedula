import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { updateRoom, deleteRoom } from "@/lib/server/coordinatorService";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── PUT /api/coordinator/rooms/[id] ─────────────────────────────────────────
export async function PUT(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: "Room ID is required." }, { status: 400 });
    }

    const body = await request.json();
    const iOid = await resolveInstitutionId(institutionId);
    
    const room = await updateRoom(iOid.toString(), id, body);
    return NextResponse.json({ ok: true, room });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

// ── DELETE /api/coordinator/rooms/[id] ──────────────────────────────────────
export async function DELETE(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "Room ID is required." }, { status: 400 });
    }

    const iOid = await resolveInstitutionId(institutionId);
    const success = await deleteRoom(iOid.toString(), id);

    if (!success) {
      return NextResponse.json({ message: "Room not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}
