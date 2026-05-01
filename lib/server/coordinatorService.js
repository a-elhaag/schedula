import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

function validateObjectId(id, fieldName) {
  if (process.env.BYPASS_AUTH === "true" && id === "demo-institution") {
    // Map to a fixed demo ObjectId
    return new ObjectId(process.env.BYPASS_AUTH_USER_INSTITUTION ?? "69b538e5aa373449d761b122");
  }
  if (!ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.status = 400;
    throw error;
  }
  return new ObjectId(id);
}


// Existing functions...
export async function getCoordinatorCourses(institutionId, options = {}) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");

  const query = {
    institution_id: institutionObjectId,
    deleted_at: null,
  };

  if (options.departmentId) {
    query.department_id = validateObjectId(options.departmentId, "departmentId");
  }

  const rawLimit = Number(options.limit);
  const limit =
    !Number.isFinite(rawLimit) || rawLimit <= 0
      ? 100
      : Math.min(Math.floor(rawLimit), 500);

  const rawSkip = Number(options.skip);
  const skip =
    !Number.isFinite(rawSkip) || rawSkip < 0 ? 0 : Math.floor(rawSkip);

  const courses = await db
    .collection("courses")
    .find(query)
    .skip(skip)
    .limit(limit)
    .sort({ code: 1 })
    .toArray();

  const count = await db.collection("courses").countDocuments(query);

  return {
    items: courses.map((c) => ({
      id:                 c._id.toString(),
      code:               c.code,
      name:               c.name,
      credit_hours:       c.credit_hours,
      level:              c.level ?? 1,
      has_lecture:        c.has_lecture  ?? false,
      has_tutorial:       c.has_tutorial ?? false,
      has_lab:            c.has_lab      ?? false,
      has_tut_lab:        c.has_tut_lab  ?? false,
      groups_per_lecture: c.groups_per_lecture ?? 1,
      professor_id:       c.professor_id?.toString() ?? null,
      ta_ids:             (c.ta_ids ?? []).map(id => id.toString()),
      createdAt:          c.created_at?.toISOString(),
    })),
    total: count,
    skip,
    limit,
  };
}

export async function getCoordinatorStaff(institutionId, options = {}) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");

  const query = {
    institution_id: institutionObjectId,
    deleted_at: null,
    role: { $in: ["professor", "ta"] },
  };

  if (options.role && ["professor", "ta"].includes(options.role)) {
    query.role = options.role;
  }

  const limit = Math.min(options.limit || 100, 500);
  const skip = options.skip || 0;

  const staff = await db
    .collection("users")
    .find(query)
    .skip(skip)
    .limit(limit)
    .sort({ name: 1 })
    .toArray();

  const count = await db.collection("users").countDocuments(query);

  return {
    items: staff.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      email: s.email,
      role: s.role,
      department: s.department || "N/A",
      createdAt: s.created_at?.toISOString(),
    })),
    total: count,
    skip,
    limit,
  };
}

// NEW: Create course
export async function createCourse(institutionId, courseData) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");

  const course = {
    institution_id: institutionObjectId,
    code: courseData.code,
    name: courseData.name,
    credit_hours: Number(courseData.credit_hours) || 3,
    num_sections: Number(courseData.num_sections) || 1,
    year_levels: Array.isArray(courseData.year_levels) ? courseData.year_levels.filter(y => [1, 2, 3, 4].includes(y)).sort((a, b) => a - b) : [],
    section_types: Array.isArray(courseData.section_types) ? courseData.section_types : [],
    department_id: courseData.departmentId ? validateObjectId(courseData.departmentId, "departmentId") : null,
    created_at: new Date(),
    deleted_at: null
  };

  const result = await db.collection("courses").insertOne(course);
  return { id: result.insertedId.toString(), ...course };
}

// NEW: Update course
export async function updateCourse(institutionId, courseId, updateData) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");
  const courseObjectId = validateObjectId(courseId, "courseId");

  const fieldsToUpdate = {};
  if (updateData.code !== undefined) fieldsToUpdate.code = updateData.code;
  if (updateData.name !== undefined) fieldsToUpdate.name = updateData.name;
  if (updateData.credit_hours !== undefined) fieldsToUpdate.credit_hours = Number(updateData.credit_hours) || 3;
  if (updateData.num_sections !== undefined) fieldsToUpdate.num_sections = Number(updateData.num_sections) || 1;
  if (updateData.sections !== undefined) fieldsToUpdate.num_sections = Number(updateData.sections) || 1;
  if (updateData.year_levels !== undefined) fieldsToUpdate.year_levels = Array.isArray(updateData.year_levels) ? updateData.year_levels.filter(y => [1, 2, 3, 4].includes(y)).sort((a, b) => a - b) : [];
  if (updateData.section_types !== undefined) fieldsToUpdate.section_types = Array.isArray(updateData.section_types) ? updateData.section_types : [];

  fieldsToUpdate.updated_at = new Date();

  await db.collection("courses").updateOne(
    { _id: courseObjectId, institution_id: institutionObjectId },
    { $set: fieldsToUpdate }
  );

  return { id: courseId, ...updateData };
}

// NEW: Soft delete course
export async function deleteCourse(institutionId, courseId) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");
  const courseObjectId = validateObjectId(courseId, "courseId");

  const result = await db.collection("courses").updateOne(
    { _id: courseObjectId, institution_id: institutionObjectId },
    { $set: { deleted_at: new Date() } }
  );

  return result.modifiedCount > 0;
}

// NEW: Calculate staff workload % (simplified: assigned sessions / max 20/week)
export async function getStaffWorkload(institutionId, staffId) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");
  const staffObjectId = validateObjectId(staffId, "staffId");

  const pipeline = [
    { $match: { 
      institution_id: institutionObjectId, 
      "entries.staff_id": staffObjectId,
      is_published: true 
    }},
    { $unwind: "$entries" },
    { $match: { "entries.staff_id": staffObjectId }},
    { $count: "sessionCount" }
  ];

  const result = await db.collection("schedules").aggregate(pipeline).toArray();
  const sessionCount = result[0]?.sessionCount || 0;
  const workload = Math.round((sessionCount / 20) * 100); // Assume max 20 sessions/week

  return { staffId, sessionCount, workload: Math.min(workload, 100) };
}

// NEW: Detect conflicts in schedule
export async function detectConflicts(scheduleId) {
  const db = await getDb();
  const scheduleObjectId = validateObjectId(scheduleId, "scheduleId");

  const schedule = await db.collection("schedules").findOne({ 
    _id: scheduleObjectId 
  });

  if (!schedule?.entries) return [];

  const conflicts = [];
  const slotMap = new Map();

  for (const entry of schedule.entries) {
    const key = `${entry.day}-${entry.start}-${entry.end}`;
    if (!slotMap.has(key)) slotMap.set(key, []);
    slotMap.get(key).push(entry);
  }

  for (const [slot, entries] of slotMap) {
    if (entries.length > 1) {
      // Room or staff double-booked
      const roomEntries = entries.filter(e => e.room_id);
      const staffEntries = entries.filter(e => e.staff_id);
      
      if (new Set(roomEntries.map(e => e.room_id.toString())).size < roomEntries.length) {
        conflicts.push({
          id: `room:${slot}`,
          conflictKey: `room:${slot}`,
          type: "room",
          slot,
          entries: roomEntries.slice(0, 3).map((entry) => ({
            course_id: entry.course_id?.toString?.() ?? entry.course_id,
            section_id: entry.section_id,
            room_id: entry.room_id?.toString?.() ?? entry.room_id,
            staff_id: entry.staff_id?.toString?.() ?? entry.staff_id,
            day: entry.day,
            start: entry.start,
            end: entry.end,
          })),
        });
      }
      if (new Set(staffEntries.map(e => e.staff_id.toString())).size < staffEntries.length) {
        conflicts.push({
          id: `staff:${slot}`,
          conflictKey: `staff:${slot}`,
          type: "staff",
          slot,
          entries: staffEntries.slice(0, 3).map((entry) => ({
            course_id: entry.course_id?.toString?.() ?? entry.course_id,
            section_id: entry.section_id,
            room_id: entry.room_id?.toString?.() ?? entry.room_id,
            staff_id: entry.staff_id?.toString?.() ?? entry.staff_id,
            day: entry.day,
            start: entry.start,
            end: entry.end,
          })),
        });
      }
    }
  }

  return conflicts;
}

// ============================================================================
// ENROLLMENT FUNCTIONS (PHASE 2)
// ============================================================================

/**
 * Get enrollment for a single course
 */
export async function getEnrollment(institutionId, courseId, termLabel) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");
  const courseObjectId = validateObjectId(courseId, "courseId");

  const enrollment = await db.collection("enrollments").findOne({
    institution_id: institutionObjectId,
    term_label: termLabel,
    course_id: courseObjectId,
    deleted_at: null,
  });

  if (!enrollment) return null;

  return {
    id: enrollment._id.toString(),
    courseId: enrollment.course_id.toString(),
    enrolledStudents: enrollment.enrolled_students,
    capacity: enrollment.capacity,
    fillRate: enrollment.capacity > 0 
      ? Math.round((enrollment.enrolled_students / enrollment.capacity) * 100) 
      : 0,
    updatedAt: enrollment.updated_at?.toISOString(),
  };
}

/**
 * Get enrollments for multiple courses in one query
 * Returns map of courseId -> enrollment data
 */
export async function getEnrollmentsByCourseIds(institutionId, termLabel, courseIds) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");
  
  const courseObjectIds = courseIds.map(id => 
    ObjectId.isValid(id) ? new ObjectId(id) : null
  ).filter(Boolean);

  if (courseObjectIds.length === 0) return {};

  const enrollments = await db.collection("enrollments").find({
    institution_id: institutionObjectId,
    term_label: termLabel,
    course_id: { $in: courseObjectIds },
    deleted_at: null,
  }).toArray();

  const result = {};
  for (const e of enrollments) {
    const courseId = e.course_id.toString();
    result[courseId] = {
      enrolledStudents: e.enrolled_students,
      capacity: e.capacity,
      fillRate: e.capacity > 0 
        ? Math.round((e.enrolled_students / e.capacity) * 100)
        : 0,
      updatedAt: e.updated_at?.toISOString(),
    };
  }

  return result;
}

/**
 * Create or update enrollment
 */
export async function upsertEnrollment(institutionId, courseId, termLabel, enrolledStudents, capacity) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");
  const courseObjectId = validateObjectId(courseId, "courseId");

  if (!Number.isInteger(enrolledStudents) || enrolledStudents < 0) {
    const error = new Error("enrolledStudents must be a non-negative integer");
    error.status = 400;
    throw error;
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    const error = new Error("capacity must be a positive integer");
    error.status = 400;
    throw error;
  }

  const now = new Date();
  const result = await db.collection("enrollments").updateOne(
    {
      institution_id: institutionObjectId,
      term_label: termLabel,
      course_id: courseObjectId,
    },
    {
      $set: {
        institution_id: institutionObjectId,
        term_label: termLabel,
        course_id: courseObjectId,
        enrolled_students: enrolledStudents,
        capacity: capacity,
        updated_at: now,
        deleted_at: null,
      },
      $setOnInsert: {
        created_at: now,
      },
    },
    { upsert: true }
  );

  return {
    created: result.upsertedId !== undefined,
    enrolledStudents,
    capacity,
    fillRate: capacity > 0 
      ? Math.round((enrolledStudents / capacity) * 100)
      : 0,
  };
}

/**
 * Soft delete enrollment
 */
export async function deleteEnrollment(institutionId, courseId, termLabel) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");
  const courseObjectId = validateObjectId(courseId, "courseId");

  const result = await db.collection("enrollments").updateOne(
    {
      institution_id: institutionObjectId,
      term_label: termLabel,
      course_id: courseObjectId,
      deleted_at: null,
    },
    {
      $set: {
        deleted_at: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

