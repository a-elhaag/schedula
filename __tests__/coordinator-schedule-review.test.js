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
const { GET, POST } = require("@/app/api/coordinator/schedule/review/route");

function createDbMock({
  schedule,
  resolvedDocs = [],
  latestRevision = null,
  approveMatchedCount = 1,
  reopenMatchedCount = 1,
} = {}) {
  const scheduleDoc =
    schedule ??
    {
      _id: new ObjectId("669b538e5aa373449d761b80"),
      institution_id: new ObjectId("669b538e5aa373449d761b12"),
      term_label: "Spring 2026",
      is_published: false,
      entries: [],
      created_at: new Date(),
    };

  const collections = {
    schedules: {
      findOne: jest.fn().mockResolvedValue(scheduleDoc),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: approveMatchedCount }),
    },
    courses: {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
    },
    rooms: {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
    },
    users: {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
    },
    conflict_resolutions: {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(resolvedDocs) })),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: reopenMatchedCount }),
    },
    schedule_revisions: {
      findOne: jest.fn().mockResolvedValue(latestRevision),
      insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId("669b538e5aa373449d761b90") }),
    },
  };

  return {
    db: {
      collection: (name) => {
        if (!collections[name]) {
          throw new Error(`Unknown collection: ${name}`);
        }
        return collections[name];
      },
    },
    collections,
    scheduleDoc,
  };
}

describe("/api/coordinator/schedule/review", () => {
  const institutionObjectId = new ObjectId("669b538e5aa373449d761b12");

  beforeEach(() => {
    jest.resetAllMocks();

    getCurrentUser.mockReturnValue({
      userId: "669b538e5aa373449d761b13",
      institutionId: "669b538e5aa373449d761b12",
    });

    resolveInstitutionId.mockResolvedValue(institutionObjectId);
  });

  it("GET returns unresolved and resolved conflicts separately", async () => {
    const { db } = createDbMock({
      resolvedDocs: [
        {
          conflict_key: "room:Monday-09:00-10:00",
          resolution_action: "reassign_room",
          notes: "Moved to B201",
          resolved_at: new Date(),
          resolved_by: "Coordinator",
          status: "resolved",
          deleted_at: null,
        },
      ],
    });

    getDb.mockResolvedValue(db);

    detectConflicts.mockResolvedValue([
      {
        id: "room:Monday-09:00-10:00",
        conflictKey: "room:Monday-09:00-10:00",
        type: "room",
        slot: "Monday-09:00-10:00",
        entries: [],
      },
      {
        id: "staff:Monday-09:00-10:00",
        conflictKey: "staff:Monday-09:00-10:00",
        type: "staff",
        slot: "Monday-09:00-10:00",
        entries: [],
      },
    ]);

    const req = new Request("http://localhost/api/coordinator/schedule/review", {
      method: "GET",
    });

    const response = await GET(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.conflicts).toHaveLength(1);
    expect(payload.resolvedConflicts).toHaveLength(1);
    expect(payload.stats.unresolved).toBe(1);
    expect(payload.stats.resolved).toBe(1);
  });

  it("POST resolve_conflict persists a resolution", async () => {
    const { db, collections, scheduleDoc } = createDbMock();
    getDb.mockResolvedValue(db);

    const req = new Request("http://localhost/api/coordinator/schedule/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resolve_conflict",
        scheduleId: scheduleDoc._id.toString(),
        conflict: {
          type: "room",
          slot: "Monday-09:00-10:00",
          conflictKey: "room:Monday-09:00-10:00",
          entries: [
            { course_id: "course-1", section_id: "G1" },
            { course_id: "course-2", section_id: "G2" },
          ],
        },
        resolutionAction: "reassign_room",
        notes: "Move one section to C101",
      }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);

    const [query, update, options] = collections.conflict_resolutions.updateOne.mock.calls[0];
    expect(query.conflict_key).toBe("room:Monday-09:00-10:00");
    expect(update.$set.resolution_action).toBe("reassign_room");
    expect(update.$set.status).toBe("resolved");
    expect(options.upsert).toBe(true);
  });

  it("POST reopen_conflict sets resolution status back to open", async () => {
    const { db, collections, scheduleDoc } = createDbMock({ reopenMatchedCount: 1 });
    getDb.mockResolvedValue(db);

    const req = new Request("http://localhost/api/coordinator/schedule/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reopen_conflict",
        scheduleId: scheduleDoc._id.toString(),
        conflict: {
          type: "staff",
          slot: "Tuesday-10:00-11:00",
          conflictKey: "staff:Tuesday-10:00-11:00",
        },
      }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);

    const [, update] = collections.conflict_resolutions.updateOne.mock.calls[0];
    expect(update.$set.status).toBe("open");
  });

  it("POST approve publishes schedule and creates next revision snapshot", async () => {
    const { db, collections, scheduleDoc } = createDbMock({
      latestRevision: { revision_number: 2 },
      approveMatchedCount: 1,
    });
    getDb.mockResolvedValue(db);

    const req = new Request("http://localhost/api/coordinator/schedule/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        scheduleId: scheduleDoc._id.toString(),
      }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.revisionNumber).toBe(3);

    expect(collections.schedules.updateOne).toHaveBeenCalled();
    expect(collections.schedule_revisions.insertOne).toHaveBeenCalled();

    const insertedDoc = collections.schedule_revisions.insertOne.mock.calls[0][0];
    expect(insertedDoc.revision_number).toBe(3);
    expect(insertedDoc.schedule_id.toString()).toBe(scheduleDoc._id.toString());
  });
});
