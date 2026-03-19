import { getDb } from "@/lib/db";
import { validateAndParseId, parsePagination } from "@/lib/server/utils";

/**
 * Get all courses for a coordinator's institution
 * @param {string} institutionId
 * @param {{departmentId?: string, limit?: number, skip?: number}} options
 */
export async function getCoordinatorCourses(institutionId, options = {}) {
  const db = await getDb();
  const institutionObjectId = validateAndParseId(institutionId, "institutionId");
  const { limit, skip } = parsePagination(options.limit, options.skip);

  const query = {
    institution_id: institutionObjectId,
    deleted_at: null,
  };

  if (options.departmentId) {
    query.department_id = validateAndParseId(options.departmentId, "departmentId");
  }

  // OPTIMIZATION: Single aggregation pipeline for count + items
  const [results] = await db
    .collection("courses")
    .aggregate([
      { $match: query },
      {
        $facet: {
          items: [
            { $sort: { code: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                id: { $toString: "$_id" },
                code: 1,
                name: 1,
                credits: "$credit_hours",
                sectionCount: { $size: { $ifNull: ["$sections", []] } },
                createdAt: { $dateToString: { date: "$created_at" } },
              },
            },
          ],
          count: [{ $count: "total" }],
        },
      },
    ])
    .toArray();

  const items = results.items;
  const total = results.count[0]?.total ?? 0;

  return { items, total, skip, limit };
}

/**
 * Get all rooms for a coordinator's institution
 * @param {string} institutionId
 * @param {{building?: string, limit?: number, skip?: number}} options
 */
export async function getCoordinatorRooms(institutionId, options = {}) {
  const db = await getDb();
  const institutionObjectId = validateAndParseId(institutionId, "institutionId");
  const { limit, skip } = parsePagination(options.limit, options.skip);

  const query = {
    institution_id: institutionObjectId,
    deleted_at: null,
  };

  if (options.building) {
    query.building = options.building;
  }

  // OPTIMIZATION: Single aggregation pipeline for count + items
  const [results] = await db
    .collection("rooms")
    .aggregate([
      { $match: query },
      {
        $facet: {
          items: [
            { $sort: { label: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                id: { $toString: "$_id" },
                label: 1,
                name: 1,
                building: { $ifNull: ["$building", "N/A"] },
                createdAt: { $dateToString: { date: "$created_at" } },
              },
            },
          ],
          count: [{ $count: "total" }],
        },
      },
    ])
    .toArray();

  const items = results.items;
  const total = results.count[0]?.total ?? 0;

  return { items, total, skip, limit };
}

/**
 * Get all staff (professors, TAs) for a coordinator's institution
 * @param {string} institutionId
 * @param {{role?: string, limit?: number, skip?: number}} options
 */
export async function getCoordinatorStaff(institutionId, options = {}) {
  const db = await getDb();
  const institutionObjectId = validateAndParseId(institutionId, "institutionId");
  const { limit, skip } = parsePagination(options.limit, options.skip);

  const query = {
    institution_id: institutionObjectId,
    deleted_at: null,
    role: { $in: ["professor", "ta"] },
  };

  // Filter by role if specified
  if (options.role && ["professor", "ta"].includes(options.role)) {
    query.role = options.role;
  }

  // OPTIMIZATION: Single aggregation pipeline for count + items
  const [results] = await db
    .collection("users")
    .aggregate([
      { $match: query },
      {
        $facet: {
          items: [
            { $sort: { name: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                id: { $toString: "$_id" },
                name: 1,
                email: 1,
                role: 1,
                createdAt: { $dateToString: { date: "$created_at" } },
              },
            },
          ],
          count: [{ $count: "total" }],
        },
      },
    ])
    .toArray();

  const items = results.items;
  const total = results.count[0]?.total ?? 0;

  return { items, total, skip, limit };
}
