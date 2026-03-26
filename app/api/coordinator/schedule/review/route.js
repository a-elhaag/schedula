import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { detectConflicts } from "@/lib/server/coordinatorService";
import { ObjectId } from "mongodb";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── GET /api/coordinator/schedule/review ─────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const db   = await getDb();
    const iOid = await resolveInstitutionId(institutionId);
    const schedule = await db.collection("schedules").findOne({ institution_id: iOid },
      { sort: { created_at: -1 } }
    );

    if (!schedule) {
      return NextResponse.json({
        scheduleId:  null,
        sessions:    [],
        conflicts:   [],
        isPublished: false,
        stats:       { totalSessions: 0, coverage: 0, unresolved: 0 },
      });
    }

    // Detect conflicts
    const conflicts = await detectConflicts(schedule._id.toString());

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
    sessions.sort((a, b) => (dayOrder[a.day] ?? 9) - (dayOrder[b.day] ?? 9) || a.start.localeCompare(b.start));

    return NextResponse.json({
      scheduleId:  schedule._id.toString(),
      sessions,
      conflicts,
      isPublished: schedule.is_published ?? false,
      stats: {
        totalSessions: sessions.length,
        coverage:      Math.round((sessions.length / Math.max(sessions.length + conflicts.length, 1)) * 100),
        unresolved:    conflicts.length,
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

    if (action !== "approve") {
      return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    }

    if (!scheduleId || !ObjectId.isValid(scheduleId)) {
      return NextResponse.json({ message: "Invalid scheduleId" }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection("schedules").updateOne(
      {
        _id:            new ObjectId(scheduleId),
       institution_id: await resolveInstitutionId(institutionId),
      },
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

    return NextResponse.json({ ok: true, message: "Schedule published successfully" });

  } catch (err) {
    const status = err.status ?? 500;
    return NextResponse.json({ message: err.message ?? "Server error" }, { status });
  }
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
}