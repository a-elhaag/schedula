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
      id: c._id.toString(),
      code: c.code,
      name: c.name,
      credits: c.credit_hours,
      sectionCount: c.sections?.length ?? 0,
      createdAt: c.created_at?.toISOString(),
    })),
    total: count,
    skip,
    limit,
  };
}

export async function getCoordinatorRooms(institutionId, options = {}) {
  const db = await getDb();
  const institutionObjectId = validateObjectId(institutionId, "institutionId");

  const query = {
    institution_id: institutionObjectId,
    deleted_at: null,
  };

  if (options.building) {
    query.building = options.building;
  }

  const rawLimit = Number(options.limit);
  const limit =
    !Number.isFinite(rawLimit) || rawLimit <= 0
      ? 100
      : Math.min(Math.floor(rawLimit), 500);

  const rawSkip = Number(options.skip);
  const skip =
    !Number.isFinite(rawSkip) || rawSkip < 0 ? 0 : Math.floor(rawSkip);

  const rooms = await db
    .collection("rooms")
    .find(query)
    .skip(skip)
    .limit(limit)
    .sort({ label: 1 })
    .toArray();

  const count = await db.collection("rooms").countDocuments(query);

  return {
    items: rooms.map((r) => ({
      id: r._id.toString(),
      label: r.label,
      name: r.name,
      building: r.building || "N/A",
      capacity: r.capacity || 30,
      createdAt: r.created_at?.toISOString(),
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
    sections: Number(courseData.sections) || 1,
    department_id: courseData.departmentId ? validateObjectId(courseData.departmentId, "departmentId") : null,
    created_at: new Date(),
    deleted_at: null
  };

  const result = await db.collection("courses").insertOne(course);
  return { id: result.insertedId.toString(), ...course };
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
        conflicts.push({ type: "room", slot, entries: roomEntries.slice(0,3) });
      }
      if (new Set(staffEntries.map(e => e.staff_id.toString())).size < staffEntries.length) {
        conflicts.push({ type: "staff", slot, entries: staffEntries.slice(0,3) });
      }
    }
  }

  return conflicts;
}

