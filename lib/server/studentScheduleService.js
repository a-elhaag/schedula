import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

const DAY_ORDER = {
  Saturday: 1,
  Sunday: 2,
  Monday: 3,
  Tuesday: 4,
  Wednesday: 5,
  Thursday: 6,
  Friday: 7,
};

function normalizeTime(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const [hour = "99", minute = "99"] = String(value).split(":");
  return Number(hour) * 60 + Number(minute);
}

function validateObjectId(value, fieldName) {
  if (!ObjectId.isValid(value)) {
    const err = new Error(`Invalid ${fieldName}`);
    err.status = 400;
    throw err;
  }

  return new ObjectId(value);
}

function normalizePaginationValue(value, defaultValue) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return defaultValue;
  }
  return Math.floor(num);
}

/**
 * Get student schedule with optional filters and pagination
 * @param {Object} params
 * @param {string} params.institutionId
 * @param {string} [params.termLabel]
 * @param {string} [params.day] - Filter by specific day
 * @param {string} [params.instructorId] - Filter by instructor/staff ID
 * @param {string} [params.courseCode] - Filter by course code
 * @param {number} [params.limit=50]
 * @param {number} [params.skip=0]
 */
export async function getStudentSchedule(params = {}) {
  const {
    institutionId,
    termLabel,
    day,
    instructorId,
    courseCode,
    limit: rawLimit = 50,
    skip: rawSkip = 0,
  } = params;

  const limit = normalizePaginationValue(rawLimit, 50);
  const skip = normalizePaginationValue(rawSkip, 0);

  const db = await getDb();

  let institutionObjectId;
  if (institutionId) {
    institutionObjectId = validateObjectId(institutionId, "institutionId");
  } else {
    const defaultInstitution = await db
      .collection("institutions")
      .findOne({}, { projection: { _id: 1 } });

    if (!defaultInstitution) {
      return null;
    }

    institutionObjectId = defaultInstitution._id;
  }

  const query = {
    institution_id: institutionObjectId,
  };

  if (termLabel) {
    query.term_label = termLabel;
  }

  const schedule = await db
    .collection("schedules")
    .find(query)
    .sort({ approved_at: -1, created_at: -1 })
    .limit(1)
    .next();

  if (!schedule) {
    return null;
  }

  const courseIds = new Set();
  const roomIds = new Set();
  const staffIds = new Set();

  for (const entry of schedule.entries ?? []) {
    if (entry.course_id) courseIds.add(entry.course_id.toString());
    if (entry.room_id) roomIds.add(entry.room_id.toString());
    if (entry.staff_id) staffIds.add(entry.staff_id.toString());
  }

  const [courses, rooms, staff] = await Promise.all([
    db
      .collection("courses")
      .find(
        { _id: { $in: [...courseIds].map((id) => new ObjectId(id)) } },
        { projection: { code: 1, name: 1 } },
      )
      .toArray(),
    db
      .collection("rooms")
      .find(
        { _id: { $in: [...roomIds].map((id) => new ObjectId(id)) } },
        { projection: { label: 1 } },
      )
      .toArray(),
    db
      .collection("users")
      .find(
        { _id: { $in: [...staffIds].map((id) => new ObjectId(id)) } },
        { projection: { name: 1 } },
      )
      .toArray(),
  ]);

  const courseMap = new Map(courses.map((item) => [item._id.toString(), item]));
  const roomMap = new Map(rooms.map((item) => [item._id.toString(), item]));
  const staffMap = new Map(staff.map((item) => [item._id.toString(), item]));

  // Map and filter entries
  let entries = (schedule.entries ?? []).map((entry) => {
    const course = courseMap.get(entry.course_id?.toString());
    const room = roomMap.get(entry.room_id?.toString());
    const instructor = staffMap.get(entry.staff_id?.toString());

    return {
      id: `${entry.course_id}-${entry.section_id}-${entry.day}-${entry.start}`,
      day: entry.day,
      start: entry.start,
      end: entry.end,
      sectionId: entry.section_id,
      courseCode: course?.code ?? "N/A",
      courseName: course?.name ?? "Unknown course",
      roomLabel: room?.label ?? "TBD",
      instructorName: instructor?.name ?? "TBD",
      staffId: entry.staff_id?.toString(),
    };
  });

  // Apply filters
  if (day) {
    entries = entries.filter((e) => e.day === day);
  }

  if (instructorId) {
    const staffObjectId = validateObjectId(instructorId, "instructorId");
    entries = entries.filter((e) => e.staffId === staffObjectId.toString());
  }

  if (courseCode) {
    entries = entries.filter((e) =>
      e.courseCode.toLowerCase().includes(courseCode.toLowerCase()),
    );
  }

  // Sort by day then time
  entries.sort((a, b) => {
    const dayComparison =
      (DAY_ORDER[a.day] ?? Number.MAX_SAFE_INTEGER) -
      (DAY_ORDER[b.day] ?? Number.MAX_SAFE_INTEGER);

    if (dayComparison !== 0) return dayComparison;
    return normalizeTime(a.start) - normalizeTime(b.start);
  });

  const total = entries.length;
  const paginatedEntries = entries.slice(skip, skip + limit);

  return {
    scheduleId: schedule._id.toString(),
    institutionId: schedule.institution_id.toString(),
    termLabel: schedule.term_label,
    isPublished: Boolean(schedule.is_published),
    entryCount: paginatedEntries.length,
    total,
    skip,
    limit,
    entries: paginatedEntries,
  };
}
