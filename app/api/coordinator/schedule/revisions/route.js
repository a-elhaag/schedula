import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";

function toObjectId(value) {
  if (value instanceof ObjectId) return value;
  if (!value || !ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

export async function GET(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid = await resolveInstitutionId(user.institutionId);
    const db = await getDb();

    const { searchParams } = new URL(request.url);
    const termLabelParam = searchParams.get("termLabel");

    let termLabel = termLabelParam;
    if (!termLabel) {
      const institution = await db.collection("institutions").findOne({ _id: iOid });
      termLabel = institution?.active_term?.label ?? "Spring 2026";
    }

    const revisions = await db
      .collection("schedule_revisions")
      .find(
        {
          institution_id: iOid,
          term_label: termLabel,
          deleted_at: null,
        },
        {
          projection: {
            _id: 1,
            revision_number: 1,
            schedule_id: 1,
            published_at: 1,
            entries: 1,
            hard_violations: 1,
            soft_penalty_total: 1,
            warnings: 1,
            notes: 1,
          },
        }
      )
      .sort({ revision_number: -1 })
      .toArray();

    const scheduleIds = [
      ...new Set(
        revisions
          .map((rev) => rev.schedule_id)
          .filter(Boolean)
          .map((id) => id.toString())
      ),
    ];

    let scheduleMetaMap = {};
    if (scheduleIds.length > 0) {
      const schedules = await db
        .collection("schedules")
        .find(
          {
            _id: { $in: scheduleIds.map((id) => new ObjectId(id)) },
            institution_id: iOid,
          },
          { projection: { _id: 1, published_at: 1, created_at: 1, is_published: 1 } }
        )
        .toArray();

      scheduleMetaMap = Object.fromEntries(
        schedules.map((s) => [s._id.toString(), s])
      );
    }

    return NextResponse.json({
      termLabel,
      revisions: revisions.map((rev) => {
        const scheduleId = rev.schedule_id?.toString?.() ?? null;
        const scheduleMeta = scheduleId ? scheduleMetaMap[scheduleId] : null;
        return {
          id: rev._id.toString(),
          revisionNumber: rev.revision_number,
          scheduleId,
          sessionCount: Array.isArray(rev.entries) ? rev.entries.length : 0,
          hardViolations: rev.hard_violations ?? 0,
          softPenaltyTotal: rev.soft_penalty_total ?? null,
          warningsCount: Array.isArray(rev.warnings) ? rev.warnings.length : 0,
          publishedAt: rev.published_at ?? scheduleMeta?.published_at ?? null,
          createdAt: scheduleMeta?.created_at ?? null,
          isLive: Boolean(scheduleMeta?.is_published),
          notes: rev.notes ?? "",
        };
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { message: err.message ?? "Server error" },
      { status: err.status ?? 500 }
    );
  }
}
