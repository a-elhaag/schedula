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

const { GET: getRevisions } = require("@/app/api/coordinator/schedule/revisions/route");
const { GET: compareRevisions } = require("@/app/api/coordinator/schedule/revisions/compare/route");

function createListDbMock() {
  const institutionId = new ObjectId("669b538e5aa373449d761b12");
  const scheduleId = new ObjectId("669b538e5aa373449d761bc1");

  const collections = {
    institutions: {
      findOne: jest.fn().mockResolvedValue({
        _id: institutionId,
        active_term: { label: "Spring 2026" },
      }),
    },
    schedule_revisions: {
      find: jest.fn(() => ({
        sort: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue([
            {
              _id: new ObjectId("669b538e5aa373449d761bd1"),
              revision_number: 2,
              schedule_id: scheduleId,
              entries: [{}, {}],
              warnings: [],
              hard_violations: 0,
              soft_penalty_total: 50,
              published_at: new Date("2026-04-20T08:00:00.000Z"),
              notes: "Second revision",
            },
            {
              _id: new ObjectId("669b538e5aa373449d761bd2"),
              revision_number: 1,
              schedule_id: scheduleId,
              entries: [{}],
              warnings: ["warning"],
              hard_violations: 1,
              soft_penalty_total: 90,
              published_at: new Date("2026-04-19T08:00:00.000Z"),
              notes: "Initial",
            },
          ]),
        })),
      })),
    },
    schedules: {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: scheduleId,
            is_published: true,
            published_at: new Date("2026-04-20T08:00:00.000Z"),
            created_at: new Date("2026-04-20T07:00:00.000Z"),
          },
        ]),
      })),
    },
  };

  return {
    db: {
      collection: (name) => collections[name],
    },
  };
}

function createCompareDbMock() {
  const institutionId = new ObjectId("669b538e5aa373449d761b12");
  const courseId = new ObjectId("669b538e5aa373449d761ce1");
  const roomA = new ObjectId("669b538e5aa373449d761ce2");
  const roomB = new ObjectId("669b538e5aa373449d761ce3");
  const staffA = new ObjectId("669b538e5aa373449d761ce4");
  const staffB = new ObjectId("669b538e5aa373449d761ce5");

  const leftRevision = {
    _id: new ObjectId("669b538e5aa373449d761cf1"),
    institution_id: institutionId,
    term_label: "Spring 2026",
    revision_number: 1,
    published_at: new Date("2026-04-19T08:00:00.000Z"),
    entries: [
      {
        course_id: courseId,
        section_id: "G1",
        room_id: roomA,
        staff_id: staffA,
        day: "Monday",
        start: "09:00",
        end: "10:00",
      },
      {
        course_id: courseId,
        section_id: "G2",
        room_id: roomA,
        staff_id: staffA,
        day: "Tuesday",
        start: "11:00",
        end: "12:00",
      },
    ],
  };

  const rightRevision = {
    _id: new ObjectId("669b538e5aa373449d761cf2"),
    institution_id: institutionId,
    term_label: "Spring 2026",
    revision_number: 2,
    published_at: new Date("2026-04-20T08:00:00.000Z"),
    entries: [
      {
        course_id: courseId,
        section_id: "G1",
        room_id: roomB,
        staff_id: staffB,
        day: "Monday",
        start: "09:00",
        end: "10:00",
      },
      {
        course_id: courseId,
        section_id: "G3",
        room_id: roomB,
        staff_id: staffB,
        day: "Wednesday",
        start: "13:00",
        end: "14:00",
      },
    ],
  };

  const collections = {
    schedule_revisions: {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(leftRevision)
        .mockResolvedValueOnce(rightRevision),
    },
    courses: {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: courseId,
            code: "CS101",
            name: "Intro to Computing",
            sections: [
              { section_id: "G1", type: "lecture" },
              { section_id: "G2", type: "lab" },
              { section_id: "G3", type: "tutorial" },
            ],
          },
        ]),
      })),
    },
    rooms: {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          { _id: roomA, name: "A101", label: "Lecture" },
          { _id: roomB, name: "B201", label: "Lecture" },
        ]),
      })),
    },
    users: {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          { _id: staffA, name: "Prof A" },
          { _id: staffB, name: "Prof B" },
        ]),
      })),
    },
  };

  return {
    db: {
      collection: (name) => collections[name],
    },
  };
}

describe("schedule revision APIs", () => {
  const institutionObjectId = new ObjectId("669b538e5aa373449d761b12");

  beforeEach(() => {
    jest.resetAllMocks();

    getCurrentUser.mockReturnValue({
      institutionId: "669b538e5aa373449d761b12",
      userId: "669b538e5aa373449d761b13",
    });
    resolveInstitutionId.mockResolvedValue(institutionObjectId);
  });

  it("lists revisions for coordinator", async () => {
    const { db } = createListDbMock();
    getDb.mockResolvedValue(db);

    const req = new Request("http://localhost/api/coordinator/schedule/revisions?termLabel=Spring%202026", {
      method: "GET",
    });

    const response = await getRevisions(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.revisions).toHaveLength(2);
    expect(payload.revisions[0].revisionNumber).toBe(2);
    expect(payload.revisions[0].sessionCount).toBe(2);
  });

  it("compares two revisions and returns change summary", async () => {
    const { db } = createCompareDbMock();
    getDb.mockResolvedValue(db);

    const req = new Request(
      "http://localhost/api/coordinator/schedule/revisions/compare?termLabel=Spring%202026&left=1&right=2",
      { method: "GET" }
    );

    const response = await compareRevisions(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary.added).toBe(1);
    expect(payload.summary.removed).toBe(1);
    expect(payload.summary.reassigned).toBe(1);
    expect(payload.summary.unchanged).toBe(0);
  });
});
