import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

function validateObjectId(id, fieldName) {
  if (!ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.status = 400;
    throw error;
  }
  return new ObjectId(id);
}

/**
 * Get all courses for a coordinator's institution
 * @param {string} institutionId
 * @param {{departmentId?: string, limit?: number, skip?: number}} options
 */
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

/**
 * Get all rooms for a coordinator's institution
 * @param {string} institutionId
 * @param {{building?: string, limit?: number, skip?: number}} options
 */
export async function getCoordinatorRooms(institutionId, options = {}) {
  const db = await getDb();
  const institutionObjectId = new ObjectId(institutionId);

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
      createdAt: r.created_at?.toISOString(),
    })),
    total: count,
    skip,
    limit,
  };
}

/**
 * Get all staff (professors, TAs) for a coordinator's institution
 * @param {string} institutionId
 * @param {{role?: string, limit?: number, skip?: number}} options
 */
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
      createdAt: s.created_at?.toISOString(),
    })),
    total: count,
    skip,
    limit,
  };
}
