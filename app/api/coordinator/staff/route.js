import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getCoordinatorStaff, getStaffWorkload } from "@/lib/server/coordinatorService";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── GET /api/coordinator/staff ────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const { searchParams } = new URL(request.url);
    const role  = searchParams.get("role") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const skip  = parseInt(searchParams.get("skip")  ?? "0");

    const iOid       = await resolveInstitutionId(institutionId);
    const resolvedId  = iOid.toString();
    const result      = await getCoordinatorStaff(resolvedId, { role, limit, skip });

    // Enrich each staff member with workload data
    const enriched = await Promise.all(
      result.items.map(async (member) => {
        const workloadData = await getStaffWorkload(resolvedId, member.id).catch(() => ({ sessionCount: 0, workload: 0 }));
        const workload = workloadData.workload;
        const statusLabel = workload >= 85 ? "High Load"
          : workload >= 60 ? "Limited"
          : "Available";
        return {
          ...member,
          workload,
          sessionCount: workloadData.sessionCount,
          statusLabel,
        };
      })
    );

    return NextResponse.json({ ...result, items: enriched });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

// ── POST /api/coordinator/staff ───────────────────────────────────────────────
// Invites a new staff member (creates user with invite_status: pending)
export async function POST(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const body = await request.json();
    const { name, email, role } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ message: "Name and email are required." }, { status: 400 });
    }

    if (!["professor", "ta"].includes(role)) {
      return NextResponse.json({ message: "Role must be professor or ta." }, { status: 400 });
    }

    const db = await getDb();

    // Check if user already exists
    const existing = await db.collection("users").findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return NextResponse.json({ message: "A user with this email already exists." }, { status: 409 });
    }

    const newUser = {
      institution_id:    new ObjectId(institutionId),
      email:             email.trim().toLowerCase(),
      password_hash:     "",
      role,
      name:              name.trim(),
      invite_status:     "pending",
      email_verified_at: null,
      created_at:        new Date(),
      deleted_at:        null,
    };

    const result = await db.collection("users").insertOne(newUser);

    return NextResponse.json({
      ok:   true,
      user: { id: result.insertedId.toString(), name, email, role },
      message: "Staff member invited. They will receive an email to set their password.",
    }, { status: 201 });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}