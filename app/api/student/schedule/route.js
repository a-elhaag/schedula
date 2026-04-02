import { getDb } from "../../../../lib/db";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/server/auth";
/**
 * GET /api/student/schedule?userId=xxx
 * Returns schedule for a student using real database data.
 * Falls back to unpublished schedule during development.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const { userId } = getCurrentUser(request);

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const db = await getDb();

    // ── 1. Get user ──────────────────────────────────────────────────────────
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // ── 2. Get institution → active term label ───────────────────────────────
    const institution = await db.collection("institutions").findOne({
      _id: user.institution_id,
    });
    const termLabel = institution?.active_term?.label ?? "Spring 2026";

    // ── 3. Get schedule — published first, then any (dev fallback) ───────────
    let schedule = await db.collection("schedules").findOne({
      institution_id: user.institution_id,
      term_label:     termLabel,
      is_published:   true,
    });

    if (!schedule) {
      // Dev fallback: show even if not published yet
      schedule = await db.collection("schedules").findOne({
        institution_id: user.institution_id,
        term_label:     termLabel,
      });
    }

    if (!schedule) {
      return Response.json({
        student:  buildStudentInfo(user, null, institution),
        sessions: {},
        term:     termLabel,
        message:  "No schedule found for this term yet",
      });
    }

    const entries = schedule.entries ?? [];

    // ── 4. Batch fetch courses, rooms, staff, faculty ────────────────────────
    const courseIds = [...new Set(entries.map(e => e.course_id.toString()))];
    const roomIds   = [...new Set(entries.map(e => e.room_id.toString()))];
    const staffIds  = [...new Set(entries.map(e => e.staff_id.toString()))];

    const [courses, rooms, staffList, faculty] = await Promise.all([
      db.collection("courses").find({ _id: { $in: courseIds.map(id => new ObjectId(id)) } }).toArray(),
      db.collection("rooms").find(  { _id: { $in: roomIds.map(id   => new ObjectId(id)) } }).toArray(),
      db.collection("users").find(  { _id: { $in: staffIds.map(id  => new ObjectId(id)) } }).toArray(),
      user.faculty_id
        ? db.collection("faculties").findOne({ _id: user.faculty_id })
        : Promise.resolve(null),
    ]);

    // ── 5. Lookup maps ───────────────────────────────────────────────────────
    const courseMap = Object.fromEntries(courses.map(c   => [c._id.toString(), c]));
    const roomMap   = Object.fromEntries(rooms.map(r     => [r._id.toString(), r]));
    const staffMap  = Object.fromEntries(staffList.map(s => [s._id.toString(), s]));

    // ── 6. Build session list ────────────────────────────────────────────────
    const studentLevel = user.year_level ?? null;

    const sessions = entries.map((entry, idx) => {
      const course  = courseMap[entry.course_id.toString()];
      const room    = roomMap[entry.room_id.toString()];
      const member  = staffMap[entry.staff_id.toString()];
      const section = course?.sections?.find(s => s.section_id === entry.section_id);

      if (!course || !room) return null;

      // Filter by year level if student has one
      if (studentLevel && section && !section.year_levels.includes(studentLevel)) {
        return null;
      }

      return {
        id:         `${entry.course_id}-${entry.section_id}-${idx}`,
        title:      course.name,
        code:       course.code,
        type:       capitalise(section?.type ?? "lecture"),
        instructor: member?.name ?? "TBA",
        room:       room.name,
        day:        entry.day,
        time:       formatTime(entry.start),
        end:        formatTime(entry.end),
        credits:    course.credit_hours ?? 0,
        enrolled:   section?.capacity ?? 0,
        about:      course.description ?? "",
      };
    }).filter(Boolean);

    // ── 7. Group by day, sort by time ────────────────────────────────────────
    const grouped = {};
    for (const s of sessions) {
      if (!grouped[s.day]) grouped[s.day] = [];
      grouped[s.day].push(s);
    }
    for (const day of Object.keys(grouped)) {
      grouped[day].sort((a, b) => a.time.localeCompare(b.time));
    }

    return Response.json({
      student:     buildStudentInfo(user, faculty, institution),
      sessions:    grouped,
      term:        termLabel,
      isPublished: schedule.is_published,
      workingDays: institution?.active_term?.working_days ?? [],
    });

  } catch (err) {
    console.error("[student/schedule] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildStudentInfo(user, faculty, institution) {
  const levelMap = { 1:"Level 1 — Year 1", 2:"Level 2 — Year 2", 3:"Level 3 — Year 3", 4:"Level 4 — Year 4" };
  return {
    name:     user.name,
    id:       user.student_id ?? user._id.toString(),
    faculty:  faculty?.name  ?? institution?.name ?? "—",
    major:    user.major     ?? "Software Engineering",
    semester: institution?.active_term?.label ?? "Spring 2026",
    level:    levelMap[user.year_level] ?? "Year 1",
  };
}

function formatTime(t) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const m      = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
}