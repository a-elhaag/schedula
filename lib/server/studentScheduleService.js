import { getDb } from "@/lib/db";
import {
  validateAndParseId,
  parsePagination,
  timeToMinutes,
} from "@/lib/server/utils";

const DAY_ORDER = {
  Saturday: 1,
  Sunday: 2,
  Monday: 3,
  Tuesday: 4,
  Wednesday: 5,
  Thursday: 6,
  Friday: 7,
};

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

  const { limit, skip } = parsePagination(rawLimit, rawSkip);
  const db = await getDb();

  let institutionObjectId;
  if (institutionId) {
    institutionObjectId = validateAndParseId(institutionId, "institutionId");
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

  // OPTIMIZATION: Single query with embedded sort
  const schedule = await db
    .collection("schedules")
    .findOne(query, {
      sort: { approved_at: -1, created_at: -1 },
    });

  if (!schedule || !schedule.entries?.length) {
    return null;
  }

  // OPTIMIZATION: Batch lookups using aggregation (only needed fields)
  const [courses, rooms, staff] = await Promise.all([
    db
      .collection("courses")
      .aggregate([
        {
          $match: {
            _id: { $in: schedule.entries.map((e) => e.course_id) },
          },
        },
        {
          $project: { code: 1, name: 1 },
        },
      ])
      .toArray(),
    db
      .collection("rooms")
      .aggregate([
        {
          $match: {
            _id: { $in: schedule.entries.map((e) => e.room_id) },
          },
        },
        {
          $project: { label: 1 },
        },
      ])
      .toArray(),
    db
      .collection("users")
      .aggregate([
        {
          $match: {
            _id: { $in: schedule.entries.map((e) => e.staff_id) },
          },
        },
        {
          $project: { name: 1 },
        },
      ])
      .toArray(),
  ]);

  const courseMap = new Map(courses.map((item) => [item._id.toString(), item]));
  const roomMap = new Map(rooms.map((item) => [item._id.toString(), item]));
  const staffMap = new Map(staff.map((item) => [item._id.toString(), item]));

  // OPTIMIZATION: Process, filter, and sort in single pipeline
  let entries = schedule.entries
    .map((entry) => {
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
    })
    // Apply filters after mapping (in-memory is fine since schedule entries are typically <100)
    .filter((e) => {
      if (day && e.day !== day) return false;
      if (courseCode && !e.courseCode.toLowerCase().includes(courseCode.toLowerCase())) return false;
      if (instructorId && e.staffId !== instructorId.toString?.()) return false;
      return true;
    })
    // Sort by day then time
    .sort((a, b) => {
      const dayDiff =
        (DAY_ORDER[a.day] ?? Number.MAX_SAFE_INTEGER) -
        (DAY_ORDER[b.day] ?? Number.MAX_SAFE_INTEGER);
      if (dayDiff !== 0) return dayDiff;
      return timeToMinutes(a.start) - timeToMinutes(b.start);
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
