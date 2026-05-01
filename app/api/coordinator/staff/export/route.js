import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getCoordinatorStaff, getStaffWorkload } from "@/lib/server/coordinatorService";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── GET /api/coordinator/staff/export ─────────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") ?? undefined;

    const iOid = await resolveInstitutionId(institutionId);
    const resolvedId = iOid.toString();
    const result = await getCoordinatorStaff(resolvedId, { role, limit: 1000, skip: 0 });

    // Enrich with workload data
    const enriched = await Promise.all(
      result.items.map(async (member) => {
        const workloadData = await getStaffWorkload(resolvedId, member.id).catch(() => ({ sessionCount: 0, workload: 0 }));
        return {
          ...member,
          workload: workloadData.workload,
          sessionCount: workloadData.sessionCount,
        };
      })
    );

    // Build CSV
    const headers = ["ID", "Name", "Email", "Role", "Workload (%)", "Sessions", "Status"];
    const rows = enriched.map((member) => {
      const status = member.workload >= 85 ? "High Load"
        : member.workload >= 60 ? "Limited"
        : "Available";
      return [
        member.id,
        member.name,
        member.email,
        member.role === "ta" ? "Teaching Assistant" : "Professor",
        member.workload,
        member.sessionCount,
        status,
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="staff-summary.csv"',
      },
    });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}
