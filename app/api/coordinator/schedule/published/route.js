import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
}

function fmt(t) {
  if (!t) return t;
  return t; // keep as-is, formatted on client
}

// ── GET /api/coordinator/schedule/published ───────────────────────────────────
export async function GET(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();

    // Get latest published schedule
    const schedule = await db.collection("schedules").findOne(
      { institution_id: iOid, is_published: true },
      { sort: { published_at: -1 } }
    );

    if (!schedule) {
      return NextResponse.json({ scheduleId: null, sessions: {}, stats: {} });
    }

    const entries   = schedule.entries ?? [];
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

    const enriched = entries.map((e, i) => {
      const course  = courseMap[e.course_id?.toString()];
      const section = course?.sections?.find(s => s.section_id === e.section_id);
      const room    = roomMap[e.room_id?.toString()];
      const member  = staffMap[e.staff_id?.toString()];
      return {
        id:         `${i}`,
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

    // Group by day
    const dayOrder = { Saturday:0, Sunday:1, Monday:2, Tuesday:3, Wednesday:4, Thursday:5 };
    const sessions = {};
    for (const s of enriched) {
      if (!sessions[s.day]) sessions[s.day] = [];
      sessions[s.day].push(s);
    }
    for (const day of Object.keys(sessions)) {
      sessions[day].sort((a, b) => a.start.localeCompare(b.start));
    }

    return NextResponse.json({
      scheduleId:  schedule._id.toString(),
      termLabel:   schedule.term_label,
      isPublished: true,
      publishedAt: schedule.published_at ?? null,
      sessions,
      stats: {
        courses: new Set(enriched.map(s => s.code)).size,
        staff:   new Set(enriched.map(s => s.instructor)).size,
        rooms:   new Set(enriched.map(s => s.room)).size,
      },
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/schedule/published  (action: unpublish) ─────────────
export async function POST(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();
    const body   = await request.json();

    if (body.action !== "unpublish") {
      return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    }

    if (!body.scheduleId || !ObjectId.isValid(body.scheduleId)) {
      return NextResponse.json({ message: "Invalid scheduleId" }, { status: 400 });
    }

    await db.collection("schedules").updateOne(
      { _id: new ObjectId(body.scheduleId), institution_id: iOid },
      { $set: { is_published: false, unpublished_at: new Date() } }
    );

    return NextResponse.json({ ok: true, message: "Schedule unpublished." });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}