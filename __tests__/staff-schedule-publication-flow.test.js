import { ObjectId } from "mongodb";

jest.mock("@/lib/server/auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/app/api/coordinator/_helpers/resolve-institution", () => ({
  resolveInstitutionId: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  getDb: jest.fn(),
}));

const { getCurrentUser } = require("@/lib/server/auth");
const { resolveInstitutionId } = require("@/app/api/coordinator/_helpers/resolve-institution");
const { getDb } = require("@/lib/db");

const { POST: reviewPOST } = require("@/app/api/coordinator/schedule/review/route");
const { POST: publishedPOST } = require("@/app/api/coordinator/schedule/published/route");
const { GET: staffScheduleGET } = require("@/app/api/staff/schedule/route");

function asComparable(value) {
  if (value instanceof ObjectId) return value.toString();
  if (value && typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }
  return value;
}

function matchesQuery(doc, query) {
  return Object.entries(query || {}).every(([key, expected]) => {
    const actual = doc[key];

    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if (Object.prototype.hasOwnProperty.call(expected, "$in")) {
        return expected.$in.some((v) => asComparable(v) === asComparable(actual));
      }
    }

    if (expected === null) {
      return actual === null || actual === undefined;
    }

    return asComparable(actual) === asComparable(expected);
  });
}

function sortDocs(docs, spec) {
  const [field, direction] = Object.entries(spec)[0];
  return [...docs].sort((a, b) => {
    const av = a[field] instanceof Date ? a[field].getTime() : a[field];
    const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
    if (av < bv) return -1 * direction;
    if (av > bv) return 1 * direction;
    return 0;
  });
}

function createDb(state) {
  return {
    collection(name) {
      if (name === "users") {
        return {
          findOne: async (query) => state.users.find((u) => matchesQuery(u, query)) ?? null,
        };
      }

      if (name === "institutions") {
        return {
          findOne: async (query) => state.institutions.find((i) => matchesQuery(i, query)) ?? null,
        };
      }

      if (name === "schedules") {
        return {
          findOne: async (query, options = {}) => {
            let docs = state.schedules.filter((s) => matchesQuery(s, query));
            if (options.sort) docs = sortDocs(docs, options.sort);
            return docs[0] ?? null;
          },
          updateOne: async (query, update) => {
            const idx = state.schedules.findIndex((s) => matchesQuery(s, query));
            if (idx < 0) return { matchedCount: 0 };

            if (update.$set) {
              state.schedules[idx] = { ...state.schedules[idx], ...update.$set };
            }
            if (update.$unset) {
              for (const key of Object.keys(update.$unset)) {
                delete state.schedules[idx][key];
              }
            }

            return { matchedCount: 1 };
          },
        };
      }

      if (name === "schedule_revisions") {
        return {
          findOne: async (query, options = {}) => {
            let docs = state.scheduleRevisions.filter((r) => matchesQuery(r, query));
            if (options.sort) docs = sortDocs(docs, options.sort);
            return docs[0] ?? null;
          },
          insertOne: async (doc) => {
            const inserted = { _id: doc._id ?? new ObjectId(), ...doc };
            state.scheduleRevisions.push(inserted);
            return { insertedId: inserted._id };
          },
        };
      }

      if (name === "courses") {
        return {
          find: (query) => ({
            toArray: async () => state.courses.filter((c) => matchesQuery(c, query)),
          }),
        };
      }

      if (name === "rooms") {
        return {
          find: (query) => ({
            toArray: async () => state.rooms.filter((r) => matchesQuery(r, query)),
          }),
        };
      }

      throw new Error(`Unsupported collection: ${name}`);
    },
  };
}

function createState() {
  const institutionId = new ObjectId("669b538e5aa373449d761b12");
  const coordinatorId = new ObjectId("669b538e5aa373449d761b13");
  const staffAId = new ObjectId("669b538e5aa373449d761b14");
  const staffBId = new ObjectId("669b538e5aa373449d761b15");
  const courseAId = new ObjectId("669b538e5aa373449d761b16");
  const courseBId = new ObjectId("669b538e5aa373449d761b17");
  const roomAId = new ObjectId("669b538e5aa373449d761b18");
  const roomBId = new ObjectId("669b538e5aa373449d761b19");
  const scheduleId = new ObjectId("669b538e5aa373449d761b20");

  return {
    ids: {
      institutionId,
      coordinatorId,
      staffAId,
      staffBId,
      scheduleId,
    },
    institutions: [
      {
        _id: institutionId,
        active_term: { label: "Spring 2026" },
      },
    ],
    users: [
      {
        _id: coordinatorId,
        role: "coordinator",
        name: "Coordinator One",
        institution_id: institutionId,
      },
      {
        _id: staffAId,
        role: "professor",
        name: "Prof Ada",
        institution_id: institutionId,
      },
      {
        _id: staffBId,
        role: "ta",
        name: "TA Grace",
        institution_id: institutionId,
      },
    ],
    schedules: [
      {
        _id: scheduleId,
        institution_id: institutionId,
        term_label: "Spring 2026",
        is_published: false,
        created_at: new Date("2026-04-20T08:00:00.000Z"),
        entries: [
          {
            course_id: courseAId,
            section_id: "G1",
            staff_id: staffAId,
            room_id: roomAId,
            day: "Monday",
            start: "09:00",
            end: "10:00",
          },
          {
            course_id: courseBId,
            section_id: "G2",
            staff_id: staffBId,
            room_id: roomBId,
            day: "Tuesday",
            start: "10:00",
            end: "11:00",
          },
        ],
        warnings: [],
        hard_violations: 0,
      },
    ],
    scheduleRevisions: [],
    courses: [
      {
        _id: courseAId,
        code: "CS101",
        name: "Intro to Computing",
        sections: [{ section_id: "G1", type: "lecture" }],
      },
      {
        _id: courseBId,
        code: "CS102",
        name: "Data Structures",
        sections: [{ section_id: "G2", type: "lab" }],
      },
    ],
    rooms: [
      { _id: roomAId, name: "A101", label: "Lecture" },
      { _id: roomBId, name: "B202", label: "Lab" },
    ],
  };
}

describe("Staff schedule publication flow", () => {
  let state;

  beforeEach(() => {
    jest.resetAllMocks();
    state = createState();

    getCurrentUser.mockImplementation((request, options = {}) => {
      if (options.requiredRole === "coordinator") {
        return {
          userId: state.ids.coordinatorId.toString(),
          institutionId: state.ids.institutionId.toString(),
        };
      }

      return {
        userId: state.ids.staffAId.toString(),
        institutionId: state.ids.institutionId.toString(),
      };
    });

    resolveInstitutionId.mockResolvedValue(state.ids.institutionId);
    getDb.mockResolvedValue(createDb(state));
  });

  it("staff sees published schedule after coordinator approves", async () => {
    const approveRes = await reviewPOST(
      new Request("http://localhost/api/coordinator/schedule/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          scheduleId: state.ids.scheduleId.toString(),
        }),
      })
    );

    expect(approveRes.status).toBe(200);

    const staffRes = await staffScheduleGET(
      new Request("http://localhost/api/staff/schedule", { method: "GET" })
    );
    const payload = await staffRes.json();

    expect(staffRes.status).toBe(200);
    expect(payload.isPublished).toBe(true);
    expect(payload.scheduleId).toBe(state.ids.scheduleId.toString());
    expect(payload.sessions.Monday).toHaveLength(1);
    expect(payload.sessions.Monday[0].courseCode).toBe("CS101");

    const allCodes = Object.values(payload.sessions).flat().map((s) => s.courseCode);
    expect(allCodes).not.toContain("CS102");
  });

  it("staff sees no published schedule after coordinator unpublishes", async () => {
    const approveRes = await reviewPOST(
      new Request("http://localhost/api/coordinator/schedule/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          scheduleId: state.ids.scheduleId.toString(),
        }),
      })
    );
    expect(approveRes.status).toBe(200);

    const unpublishRes = await publishedPOST(
      new Request("http://localhost/api/coordinator/schedule/published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unpublish",
          scheduleId: state.ids.scheduleId.toString(),
        }),
      })
    );

    expect(unpublishRes.status).toBe(200);

    const staffRes = await staffScheduleGET(
      new Request("http://localhost/api/staff/schedule", { method: "GET" })
    );
    const payload = await staffRes.json();

    expect(staffRes.status).toBe(200);
    expect(payload.isPublished).toBe(false);
    expect(payload.scheduleId).toBeNull();
    expect(payload.sessions).toEqual({});
  });
});
