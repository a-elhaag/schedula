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

jest.mock("@/lib/server/coordinatorService", () => ({
  detectConflicts: jest.fn(),
}));

const { getCurrentUser } = require("@/lib/server/auth");
const { resolveInstitutionId } = require("@/app/api/coordinator/_helpers/resolve-institution");
const { getDb } = require("@/lib/db");
const { detectConflicts } = require("@/lib/server/coordinatorService");

const { GET: reviewGET, POST: reviewPOST } = require("@/app/api/coordinator/schedule/review/route");
const { GET: publishedGET, POST: publishedPOST } = require("@/app/api/coordinator/schedule/published/route");
const { GET: revisionsGET } = require("@/app/api/coordinator/schedule/revisions/route");
const { GET: compareGET } = require("@/app/api/coordinator/schedule/revisions/compare/route");

function toComparable(value) {
  if (value instanceof ObjectId) return value.toString();
  if (value && typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }
  return value;
}

function compareSort(a, b, direction) {
  const av = a instanceof Date ? a.getTime() : a;
  const bv = b instanceof Date ? b.getTime() : b;
  if (av < bv) return -1 * direction;
  if (av > bv) return 1 * direction;
  return 0;
}

function matchesQuery(doc, query) {
  return Object.entries(query || {}).every(([key, expected]) => {
    const actual = doc[key];

    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if (Object.prototype.hasOwnProperty.call(expected, "$in")) {
        return expected.$in.some((v) => toComparable(v) === toComparable(actual));
      }
    }

    if (expected === null) {
      return actual === null || actual === undefined;
    }

    return toComparable(actual) === toComparable(expected);
  });
}

function createMockDb(state) {
  const makeCursor = (source, query) => {
    let filtered = source.filter((doc) => matchesQuery(doc, query));
    let sortSpec = null;

    return {
      sort(spec) {
        sortSpec = spec;
        return this;
      },
      project() {
        return this;
      },
      async toArray() {
        let docs = [...filtered];
        if (sortSpec) {
          const [field, direction] = Object.entries(sortSpec)[0];
          docs.sort((a, b) => compareSort(a[field], b[field], direction));
        }
        return docs;
      },
    };
  };

  return {
    collection(name) {
      if (name === "schedules") {
        return {
          findOne: async (query, options = {}) => {
            let docs = state.schedules.filter((doc) => matchesQuery(doc, query));
            if (options.sort) {
              const [field, direction] = Object.entries(options.sort)[0];
              docs = [...docs].sort((a, b) => compareSort(a[field], b[field], direction));
            }
            return docs[0] ?? null;
          },
          find: (query) => makeCursor(state.schedules, query),
          updateOne: async (filter, update) => {
            const idx = state.schedules.findIndex((doc) => matchesQuery(doc, filter));
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
            let docs = state.scheduleRevisions.filter((doc) => matchesQuery(doc, query));
            if (options.sort) {
              const [field, direction] = Object.entries(options.sort)[0];
              docs = [...docs].sort((a, b) => compareSort(a[field], b[field], direction));
            }
            return docs[0] ?? null;
          },
          find: (query) => makeCursor(state.scheduleRevisions, query),
          insertOne: async (doc) => {
            const inserted = { _id: doc._id ?? new ObjectId(), ...doc };
            state.scheduleRevisions.push(inserted);
            return { insertedId: inserted._id };
          },
        };
      }

      if (name === "conflict_resolutions") {
        return {
          find: (query) => makeCursor(state.conflictResolutions, query),
          updateOne: async (filter, update, options = {}) => {
            const idx = state.conflictResolutions.findIndex((doc) => matchesQuery(doc, filter));

            if (idx < 0 && options.upsert) {
              const inserted = {
                _id: new ObjectId(),
                ...filter,
                ...(update.$setOnInsert ?? {}),
                ...(update.$set ?? {}),
              };
              state.conflictResolutions.push(inserted);
              return { matchedCount: 0, upsertedId: inserted._id };
            }

            if (idx < 0) {
              return { matchedCount: 0 };
            }

            if (update.$set) {
              state.conflictResolutions[idx] = {
                ...state.conflictResolutions[idx],
                ...update.$set,
              };
            }

            if (update.$unset) {
              for (const key of Object.keys(update.$unset)) {
                delete state.conflictResolutions[idx][key];
              }
            }

            return { matchedCount: 1 };
          },
        };
      }

      if (name === "courses") {
        return {
          find: (query) => makeCursor(state.courses, query),
        };
      }

      if (name === "rooms") {
        return {
          find: (query) => makeCursor(state.rooms, query),
        };
      }

      if (name === "users") {
        return {
          find: (query) => makeCursor(state.users, query),
        };
      }

      if (name === "institutions") {
        return {
          findOne: async (query) => state.institutions.find((doc) => matchesQuery(doc, query)) ?? null,
        };
      }

      throw new Error(`Unsupported collection mock: ${name}`);
    },
  };
}

function createState() {
  const institutionId = new ObjectId("669b538e5aa373449d761b12");
  const scheduleId = new ObjectId("669b538e5aa373449d761d10");
  const courseId = new ObjectId("669b538e5aa373449d761d11");
  const roomId = new ObjectId("669b538e5aa373449d761d12");
  const staffId = new ObjectId("669b538e5aa373449d761d13");

  return {
    institutionId,
    scheduleId,
    conflict: {
      type: "room",
      slot: "Monday-09:00-10:00",
      conflictKey: "room:Monday-09:00-10:00",
      entries: [{ course_id: courseId.toString(), section_id: "G1" }],
    },
    schedules: [
      {
        _id: scheduleId,
        institution_id: institutionId,
        term_label: "Spring 2026",
        entries: [
          {
            course_id: courseId,
            section_id: "G1",
            room_id: roomId,
            staff_id: staffId,
            day: "Monday",
            start: "09:00",
            end: "10:00",
          },
        ],
        is_published: false,
        created_at: new Date("2026-04-20T08:00:00.000Z"),
        hard_violations: 0,
        warnings: [],
      },
    ],
    scheduleRevisions: [],
    conflictResolutions: [],
    courses: [
      {
        _id: courseId,
        code: "CS101",
        name: "Intro to Computing",
        sections: [{ section_id: "G1", type: "lecture" }],
      },
    ],
    rooms: [{ _id: roomId, name: "A101", label: "Lecture" }],
    users: [
      { _id: staffId, name: "Prof Ada", role: "professor", institution_id: institutionId },
      {
        _id: new ObjectId("669b538e5aa373449d761d14"),
        name: "Coordinator",
        role: "coordinator",
        institution_id: institutionId,
      },
    ],
    institutions: [{ _id: institutionId, active_term: { label: "Spring 2026" } }],
  };
}

describe("Coordinator schedule workflow integration", () => {
  let state;

  beforeEach(() => {
    jest.resetAllMocks();

    state = createState();

    getCurrentUser.mockReturnValue({
      userId: "669b538e5aa373449d761d14",
      institutionId: state.institutionId.toString(),
    });

    resolveInstitutionId.mockResolvedValue(state.institutionId);
    getDb.mockResolvedValue(createMockDb(state));
    detectConflicts.mockImplementation(async () => [state.conflict]);
  });

  it("supports resolve and reopen conflict lifecycle through review API", async () => {
    const initialReviewRes = await reviewGET(
      new Request("http://localhost/api/coordinator/schedule/review", { method: "GET" })
    );
    const initialReview = await initialReviewRes.json();

    expect(initialReviewRes.status).toBe(200);
    expect(initialReview.conflicts).toHaveLength(1);
    expect(initialReview.resolvedConflicts).toHaveLength(0);

    const resolveRes = await reviewPOST(
      new Request("http://localhost/api/coordinator/schedule/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_conflict",
          scheduleId: state.scheduleId.toString(),
          conflict: state.conflict,
          resolutionAction: "reassign_room",
          notes: "Move to another room",
        }),
      })
    );

    expect(resolveRes.status).toBe(200);
    expect(state.conflictResolutions).toHaveLength(1);
    expect(state.conflictResolutions[0].status).toBe("resolved");

    const resolvedReviewRes = await reviewGET(
      new Request("http://localhost/api/coordinator/schedule/review", { method: "GET" })
    );
    const resolvedReview = await resolvedReviewRes.json();

    expect(resolvedReview.conflicts).toHaveLength(0);
    expect(resolvedReview.resolvedConflicts).toHaveLength(1);

    const reopenRes = await reviewPOST(
      new Request("http://localhost/api/coordinator/schedule/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reopen_conflict",
          scheduleId: state.scheduleId.toString(),
          conflict: state.conflict,
        }),
      })
    );

    expect(reopenRes.status).toBe(200);
    expect(state.conflictResolutions[0].status).toBe("open");

    const reopenedReviewRes = await reviewGET(
      new Request("http://localhost/api/coordinator/schedule/review", { method: "GET" })
    );
    const reopenedReview = await reopenedReviewRes.json();

    expect(reopenedReview.conflicts).toHaveLength(1);
    expect(reopenedReview.resolvedConflicts).toHaveLength(0);
  });

  it("supports approve -> revisions -> compare -> unpublish lifecycle", async () => {
    const approveRes = await reviewPOST(
      new Request("http://localhost/api/coordinator/schedule/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          scheduleId: state.scheduleId.toString(),
        }),
      })
    );
    const approvePayload = await approveRes.json();

    expect(approveRes.status).toBe(200);
    expect(approvePayload.revisionNumber).toBe(1);
    expect(state.scheduleRevisions).toHaveLength(1);
    expect(state.schedules[0].is_published).toBe(true);

    const revisionsRes = await revisionsGET(
      new Request("http://localhost/api/coordinator/schedule/revisions?termLabel=Spring%202026", {
        method: "GET",
      })
    );
    const revisionsPayload = await revisionsRes.json();

    expect(revisionsRes.status).toBe(200);
    expect(revisionsPayload.revisions).toHaveLength(1);
    expect(revisionsPayload.revisions[0].revisionNumber).toBe(1);
    expect(revisionsPayload.revisions[0].isLive).toBe(true);

    const compareRes = await compareGET(
      new Request(
        "http://localhost/api/coordinator/schedule/revisions/compare?termLabel=Spring%202026&left=1&right=1",
        { method: "GET" }
      )
    );
    const comparePayload = await compareRes.json();

    expect(compareRes.status).toBe(200);
    expect(comparePayload.summary.added).toBe(0);
    expect(comparePayload.summary.removed).toBe(0);
    expect(comparePayload.summary.reassigned).toBe(0);
    expect(comparePayload.summary.unchanged).toBe(1);

    const publishedBeforeUnpublishRes = await publishedGET(
      new Request("http://localhost/api/coordinator/schedule/published", { method: "GET" })
    );
    const publishedBeforeUnpublish = await publishedBeforeUnpublishRes.json();

    expect(publishedBeforeUnpublishRes.status).toBe(200);
    expect(publishedBeforeUnpublish.scheduleId).toBe(state.scheduleId.toString());

    const unpublishRes = await publishedPOST(
      new Request("http://localhost/api/coordinator/schedule/published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unpublish",
          scheduleId: state.scheduleId.toString(),
        }),
      })
    );

    expect(unpublishRes.status).toBe(200);
    expect(state.schedules[0].is_published).toBe(false);

    const publishedAfterUnpublishRes = await publishedGET(
      new Request("http://localhost/api/coordinator/schedule/published", { method: "GET" })
    );
    const publishedAfterUnpublish = await publishedAfterUnpublishRes.json();

    expect(publishedAfterUnpublishRes.status).toBe(200);
    expect(publishedAfterUnpublish.scheduleId).toBeNull();
  });
});
