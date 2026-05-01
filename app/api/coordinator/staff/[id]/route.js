import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── PUT /api/coordinator/staff/[id] ──────────────────────────────────────────
export async function PUT(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid staff ID." }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, role } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ message: "Name and email are required." }, { status: 400 });
    }

    if (!["professor", "ta"].includes(role)) {
      return NextResponse.json({ message: "Role must be professor or ta." }, { status: 400 });
    }

    const db = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    // Check if another user has this email
    const existing = await db.collection("users").findOne({
      _id: { $ne: new ObjectId(id) },
      email: email.trim().toLowerCase(),
      institution_id: iOid,
    });

    if (existing) {
      return NextResponse.json({ message: "Another user with this email already exists." }, { status: 409 });
    }

    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(id), institution_id: iOid },
      {
        $set: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          updated_at: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    const updatedUser = result?.value || result;
    if (!updatedUser) {
      return NextResponse.json({ message: "Staff member not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser._id?.toString() || updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      message: "Staff member updated successfully.",
    });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

// ── DELETE /api/coordinator/staff/[id] ────────────────────────────────────────
export async function DELETE(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid staff ID." }, { status: 400 });
    }

    const db = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    const result = await db.collection("users").findOneAndDelete(
      { _id: new ObjectId(id), institution_id: iOid }
    );

    const deletedUser = result?.value || result;
    if (!deletedUser) {
      return NextResponse.json({ message: "Staff member not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "Staff member deleted successfully.",
    });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}
