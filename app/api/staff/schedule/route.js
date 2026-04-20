import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

/**
 * GET /api/staff/schedule
 * Returns the staff member's published schedule for their institution.
 * Filters the full schedule to only include sessions taught by the current staff member.
 */
export async function GET(request) {
  try {
    const user = getCurrentUser(request);
    
    if (!user?.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    // Get the current staff member
    const staff = await db.collection("users").findOne({
      _id: new ObjectId(user.userId),
      role: { $in: ["professor", "ta"] },
    });

    if (!staff) {
      return NextResponse.json({ message: "Staff member not found" }, { status: 404 });
    }

    // Get their institution
    const institution = await db.collection("institutions").findOne({
      _id: staff.institution_id,
    });

    if (!institution) {
      return NextResponse.json({ message: "Institution not found" }, { status: 404 });
    }

    // Get the latest published schedule for this institution
    const schedule = await db.collection("schedules").findOne(
      { 
        institution_id: staff.institution_id, 
        is_published: true 
      },
      { sort: { published_at: -1 } }
    );

    if (!schedule) {
      // No published schedule yet - return empty schedule
      return NextResponse.json({
        scheduleId: null,
        termLabel: institution?.active_term?.label ?? "Spring 2026",
        isPublished: false,
        publishedAt: null,
        sessions: {},
        stats: {
          courses: 0,
          rooms: 0,
        },
      });
    }

    // Filter entries to only those taught by this staff member
    const entries = (schedule.entries ?? []).filter(
      (e) => e.staff_id?.toString() === staff._id.toString()
    );

    if (entries.length === 0) {
      // This staff member has no sessions in the published schedule
      return NextResponse.json({
        scheduleId: schedule._id.toString(),
        termLabel: schedule.term_label,
        isPublished: true,
        publishedAt: schedule.published_at ?? null,
        sessions: {},
        stats: {
          courses: 0,
          rooms: 0,
        },
      });
    }

    // Get course and room details
    const courseIds = [...new Set(entries.map(e => e.course_id?.toString()).filter(Boolean))];
    const roomIds = [...new Set(entries.map(e => e.room_id?.toString()).filter(Boolean))];

    const [courses, rooms] = await Promise.all([
      db.collection("courses").find({ _id: { $in: courseIds.map(id => new ObjectId(id)) } }).toArray(),
      db.collection("rooms").find({ _id: { $in: roomIds.map(id => new ObjectId(id)) } }).toArray(),
    ]);

    const courseMap = Object.fromEntries(courses.map(c => [c._id.toString(), c]));
    const roomMap = Object.fromEntries(rooms.map(r => [r._id.toString(), r]));

    // Format time as "HH:MM - HH:MM"
    const formatTime = (start, end) => {
      return `${start} - ${end}`;
    };

    // Capitalize section type
    const capitalise = (str) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
    };

    // Enrich entries with course, room, and group information
    const enriched = entries.map((e, i) => {
      const course = courseMap[e.course_id?.toString()];
      const section = course?.sections?.find(s => s.section_id === e.section_id);
      const room = roomMap[e.room_id?.toString()];
      
      return {
        id: `${i}`,
        day: e.day,
        time: formatTime(e.start, e.end),
        start: e.start,
        end: e.end,
        courseCode: course?.code ?? "--",
        courseName: course?.name ?? "--",
        type: capitalise(section?.type ?? "lecture"),
        room: room?.name ?? "--",
        group: section?.section_id ?? "G1",
      };
    });

    // Group by day
    const dayOrder = { 
      Saturday: 0, 
      Sunday: 1, 
      Monday: 2, 
      Tuesday: 3, 
      Wednesday: 4, 
      Thursday: 5,
      Friday: 6,
    };
    
    const sessions = {};
    for (const s of enriched) {
      if (!sessions[s.day]) sessions[s.day] = [];
      sessions[s.day].push(s);
    }

    // Sort sessions by time within each day
    for (const day of Object.keys(sessions)) {
      sessions[day].sort((a, b) => a.start.localeCompare(b.start));
    }

    // Sort days in week order
    const sortedSessions = {};
    const sortedDays = Object.keys(sessions).sort((a, b) => dayOrder[a] - dayOrder[b]);
    for (const day of sortedDays) {
      sortedSessions[day] = sessions[day];
    }

    return NextResponse.json({
      scheduleId: schedule._id.toString(),
      termLabel: schedule.term_label,
      isPublished: true,
      publishedAt: schedule.published_at ?? null,
      sessions: sortedSessions,
      stats: {
        courses: new Set(enriched.map(s => s.courseCode)).size,
        rooms: new Set(enriched.map(s => s.room)).size,
      },
    });

  } catch (err) {
    console.error("Staff schedule API error:", err);
    return NextResponse.json(
      { message: err.message ?? "Server error" },
      { status: err.status ?? 500 }
    );
  }
}
