import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { detectConflicts } from "@/lib/server/coordinatorService";
import { ObjectId } from "mongodb";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

const RESOLUTION_ACTIONS = [
  "reassign_room",
  "reassign_staff",
  "move_slot",
  "accept_risk",
];

function getConflictKey(conflict) {
  if (conflict?.conflictKey) return conflict.conflictKey;
  return `${conflict?.type ?? "unknown"}:${conflict?.slot ?? "unknown"}`;
}

function parseResolvedByDisplay(value) {
  if (!value) return "Coordinator";
  if (typeof value === "string") return value;
  if (value?.name) return value.name;
  if (value?.email) return value.email;
  return "Coordinator";
}

// ── GET /api/coordinator/schedule/review ─────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const db   = await getDb();
    const iOid = await resolveInstitutionId(institutionId);
    // Fetch all level schedules (unpublished first, then published) — merge entries
    const allSchedules = await db.collection("schedules")
      .find({ institution_id: iOid })
      .sort({ created_at: -1 })
      .toArray();

    if (!allSchedules.length) {
      return NextResponse.json({
        scheduleId:  null,
        sessions:    [],
        conflicts:   [],
        isPublished: false,
        stats:       { totalSessions: 0, coverage: 0, unresolved: 0 },
      });
    }

    // Use most-recent set of schedules (by created_at of newest)
    const newestTime = allSchedules[0].created_at;
    const schedules  = allSchedules.filter(s =>
      Math.abs(new Date(s.created_at) - new Date(newestTime)) < 10000
    );
    // Merge into a synthetic "schedule" object for the rest of the pipeline
    const schedule = {
      _id:          schedules[0]._id,
      institution_id: iOid,
      term_label:   schedules[0].term_label,
      is_published: schedules.every(s => s.is_published),
      entries:      schedules.flatMap(s => s.entries ?? []),
    };

    // Detect conflicts and merge persisted resolutions
    const conflicts = await detectConflicts(schedule._id.toString());
    const resolvedDocs = await db.collection("conflict_resolutions").find({
      institution_id: iOid,
      schedule_id: schedule._id,
      status: "resolved",
      deleted_at: null,
    }).toArray();

    const resolutionByKey = new Map(
      resolvedDocs.map((doc) => [doc.conflict_key, doc])
    );

    const unresolvedConflicts = [];
    const resolvedConflicts = [];
    for (const conflict of conflicts) {
      const conflictKey = getConflictKey(conflict);
      const resolution = resolutionByKey.get(conflictKey);
      if (resolution) {
        resolvedConflicts.push({
          ...conflict,
          conflictKey,
          resolved: true,
          resolutionAction: resolution.resolution_action,
          resolutionNotes: resolution.notes ?? "",
          resolvedAt: resolution.resolved_at ?? resolution.updated_at ?? null,
          resolvedBy: parseResolvedByDisplay(resolution.resolved_by),
        });
      } else {
        unresolvedConflicts.push({
          ...conflict,
          conflictKey,
          resolved: false,
        });
      }
    }

    // Enrich entries with course + room + staff names
    const entries  = schedule.entries ?? [];
    const courseIds = [...new Set(entries.map(e => e.course_id?.toString()).filter(Boolean))];
    const roomIds   = [...new Set(entries.map(e => e.room_id?.toString()).filter(Boolean))];
    const staffIds  = [...new Set(entries.map(e => e.staff_id?.toString()).filter(Boolean))];

    const [courses, rooms, staff] = await Promise.all([
      db.collection("courses").find({ _id: { $in: courseIds.map(id => new ObjectId(id)) } }).toArray(),
      db.collection("rooms").find(  { _id: { $in: roomIds.map(id   => new ObjectId(id)) } }).toArray(),
      db.collection("users").find(  { _id: { $in: staffIds.map(id  => new ObjectId(id)) } }).toArray(),
    ]);

    const courseMap = Object.fromEntries(courses.map(c => [c._id.toString(), c]));
    const roomMap   = Object.fromEntries(rooms.map(r   => [r._id.toString(), r]));
    const staffMap  = Object.fromEntries(staff.map(s   => [s._id.toString(), s]));

    const sessions = entries.map(e => {
      const course  = courseMap[e.course_id?.toString()];
      const section = course?.sections?.find(s => s.section_id === e.section_id);
      const room    = roomMap[e.room_id?.toString()];
      const member  = staffMap[e.staff_id?.toString()];
      return {
        day:        e.day,
        start:      e.start,
        end:        e.end,
        code:       course?.code       ?? "--",
        name:       course?.name       ?? "--",
        type:       capitalise(section?.type ?? "lecture"),
        instructor: member?.name       ?? "TBA",
        room:       room?.name         ?? "--",
      };
    });

    // Sort by day then time
    const dayOrder = { Saturday:0, Sunday:1, Monday:2, Tuesday:3, Wednesday:4, Thursday:5 };
    sessions.sort((a, b) => {
      const dayDiff = (dayOrder[a.day] ?? 9) - (dayOrder[b.day] ?? 9);
      if (dayDiff !== 0) return dayDiff;
      // Safe comparison of start times
      const aStart = a.start ?? "";
      const bStart = b.start ?? "";
      return aStart.localeCompare(bStart);
    });

    return NextResponse.json({
      scheduleId:  schedule._id.toString(),
      sessions,
      conflicts: unresolvedConflicts,
      resolvedConflicts,
      isPublished: schedule.is_published ?? false,
      stats: {
        totalSessions: sessions.length,
        coverage:      Math.round((sessions.length / Math.max(sessions.length + unresolvedConflicts.length, 1)) * 100),
        unresolved:    unresolvedConflicts.length,
        resolved:      resolvedConflicts.length,
      },
    });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

// ── POST /api/coordinator/schedule/review  (action: approve) ─────────────────
export async function POST(request) {
  try {
    const { userId, institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const body       = await request.json();
    const { action, scheduleId } = body;

    if (!scheduleId || !ObjectId.isValid(scheduleId)) {
      return NextResponse.json({ message: "Invalid scheduleId" }, { status: 400 });
    }

    const db = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    if (action === "approve") {
      // Publish all unpublished level schedules for this term
      const termSchedules = await db.collection("schedules").find({
        institution_id: iOid,
        is_published:   false,
      }).toArray();

      if (!termSchedules.length) {
        return NextResponse.json({ message: "No unpublished schedules found" }, { status: 404 });
      }

      const result = await db.collection("schedules").updateMany(
        { institution_id: iOid, is_published: false },
        {
          $set: {
            is_published: true,
            published_at: new Date(),
            approved_by:  new ObjectId(userId),
            approved_at:  new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ message: "Schedule not found" }, { status: 404 });
      }

      const latestRevision = await db.collection("schedule_revisions").findOne(
        {
          institution_id: iOid,
          term_label: schedule.term_label,
          deleted_at: null,
        },
        { sort: { revision_number: -1 } }
      );

      const nextRevisionNumber = (latestRevision?.revision_number ?? 0) + 1;
      const now = new Date();

      await db.collection("schedule_revisions").insertOne({
        institution_id: iOid,
        term_label: schedule.term_label,
        revision_number: nextRevisionNumber,
        schedule_id: scheduleObjectId,
        published_at: now,
        published_by: ObjectId.isValid(userId) ? new ObjectId(userId) : userId,
        entries: schedule.entries ?? [],
        hard_violations: schedule.hard_violations ?? 0,
        soft_penalty_total: schedule.soft_penalty_total ?? null,
        warnings: schedule.warnings ?? [],
        notes: `Auto-created from published schedule ${scheduleObjectId.toString()}`,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      return NextResponse.json({
        ok: true,
        message: "Schedule published successfully",
        revisionNumber: nextRevisionNumber,
      });
    }

    if (action === "resolve_conflict") {
      const { conflict, resolutionAction, notes } = body;
      if (!conflict || !conflict.type || !conflict.slot) {
        return NextResponse.json({ message: "Conflict payload is required" }, { status: 400 });
      }
      if (!RESOLUTION_ACTIONS.includes(resolutionAction)) {
        return NextResponse.json({ message: "Invalid resolutionAction" }, { status: 400 });
      }

      const schedule = await db.collection("schedules").findOne({
        _id: new ObjectId(scheduleId),
        institution_id: iOid,
      });
      if (!schedule) {
        return NextResponse.json({ message: "Schedule not found" }, { status: 404 });
      }

      const conflictKey = getConflictKey(conflict);
      const now = new Date();
      await db.collection("conflict_resolutions").updateOne(
        {
          institution_id: iOid,
          schedule_id: schedule._id,
          conflict_key: conflictKey,
          deleted_at: null,
        },
        {
          $set: {
            institution_id: iOid,
            term_label: schedule.term_label,
            schedule_id: schedule._id,
            schedule_revision_id: schedule._id.toString(),
            conflict_key: conflictKey,
            conflict_type: conflict.type,
            affected_sections: Array.isArray(conflict.entries)
              ? conflict.entries.map((entry) => `${entry.course_id ?? "unknown"}:${entry.section_id ?? "unknown"}`)
              : [],
            description: `${capitalise(conflict.type)} conflict at ${conflict.slot}`,
            resolution_action: resolutionAction,
            status: "resolved",
            notes: typeof notes === "string" ? notes.trim() : "",
            resolved_by: ObjectId.isValid(userId) ? new ObjectId(userId) : userId,
            resolved_at: now,
            updated_at: now,
          },
          $setOnInsert: {
            created_at: now,
            deleted_at: null,
          },
        },
        { upsert: true }
      );

      return NextResponse.json({ ok: true, message: "Conflict resolved." });
    }

    if (action === "reopen_conflict") {
      const { conflict } = body;
      if (!conflict || !conflict.type || !conflict.slot) {
        return NextResponse.json({ message: "Conflict payload is required" }, { status: 400 });
      }

      const conflictKey = getConflictKey(conflict);
      const result = await db.collection("conflict_resolutions").updateOne(
        {
          institution_id: iOid,
          schedule_id: new ObjectId(scheduleId),
          conflict_key: conflictKey,
          deleted_at: null,
        },
        {
          $set: {
            status: "open",
            updated_at: new Date(),
          },
          $unset: {
            resolution_action: "",
            resolved_at: "",
            resolved_by: "",
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ message: "Conflict resolution not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, message: "Conflict reopened." });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
}