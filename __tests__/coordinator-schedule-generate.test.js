import { ObjectId } from "mongodb";
import { ScheduleJobStatus } from "@/lib/scheduleJobContract";

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
const { POST } = require("@/app/api/coordinator/schedule/generate/route");

function createDbMock() {
  const institutionId = new ObjectId("669b538e5aa373449d761b12");
  const staffId = new ObjectId("669b538e5aa373449d761b14");

  const collections = {
    institutions: {
      findOne: jest.fn().mockResolvedValue({
        _id: institutionId,
        active_term: {
          label: "Spring 2026",
          working_days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"],
        },
        settings: {
          daily_start: "08:00",
          daily_end: "17:00",
          slot_duration_minutes: 60,
        },
      }),
    },
    schedule_jobs: {
      insertOne: jest.fn().mockResolvedValue({
        insertedId: new ObjectId("669b538e5aa373449d761b21"),
      }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    },
    schedules: {
      insertOne: jest.fn().mockResolvedValue({
        insertedId: new ObjectId("669b538e5aa373449d761b31"),
      }),
    },
    courses: {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: new ObjectId("669b538e5aa373449d761b41"),
            sections: [
              {
                section_id: "G1",
                assigned_staff: [staffId],
                required_room_label: "Lecture",
              },
            ],
          },
        ]),
      })),
    },
    users: {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          { _id: staffId, role: "professor", name: "Prof One" },
        ]),
      })),
    },
    rooms: {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          { _id: new ObjectId("669b538e5aa373449d761b51"), label: "Lecture" },
        ]),
      })),
    },
    availability: {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([]),
      })),
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
  };
}

function createGenerateRequest() {
  return new Request("http://localhost/api/coordinator/schedule/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate" }),
  });
}

describe("POST /api/coordinator/schedule/generate", () => {
  const institutionObjectId = new ObjectId("669b538e5aa373449d761b12");

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.FASTAPI_URL = "http://solver.test";

    getCurrentUser.mockReturnValue({
      institutionId: "669b538e5aa373449d761b12",
      userId: "669b538e5aa373449d761b13",
    });

    resolveInstitutionId.mockResolvedValue(institutionObjectId);
  });

  it("marks job as failed_infeasible and does not fall back when solver returns infeasible", async () => {
    const { db, collections } = createDbMock();
    getDb.mockResolvedValue(db);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [],
        hard_violations: 2,
        summary: { validation_errors: ["H3 VIOLATION: capacity"] },
        warnings: ["No feasible schedule found"],
      }),
    });

    const response = await POST(createGenerateRequest());
    const payload = await response.json();

    const updates = collections.schedule_jobs.updateOne.mock.calls.map((call) => call[1].$set);

    expect(payload.status).toBe(ScheduleJobStatus.FAILED_INFEASIBLE);
    expect(updates.some((u) => u.status === ScheduleJobStatus.FAILED_INFEASIBLE)).toBe(true);
    expect(collections.schedules.insertOne).not.toHaveBeenCalled();
  });

  it("uses fallback generator only when solver is unavailable", async () => {
    const { db, collections } = createDbMock();
    getDb.mockResolvedValue(db);

    global.fetch = jest.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));

    const response = await POST(createGenerateRequest());
    const payload = await response.json();

    const updates = collections.schedule_jobs.updateOne.mock.calls.map((call) => call[1].$set);

    expect(payload.status).toBe(ScheduleJobStatus.COMPLETED_FALLBACK);
    expect(updates.some((u) => u.status === ScheduleJobStatus.COMPLETED_FALLBACK)).toBe(true);
    expect(collections.schedules.insertOne).toHaveBeenCalled();
  });

  it("marks job as failed for non-OK solver responses and skips fallback", async () => {
    const { db, collections } = createDbMock();
    getDb.mockResolvedValue(db);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Solver internal error" }),
    });

    const response = await POST(createGenerateRequest());
    const payload = await response.json();

    const updates = collections.schedule_jobs.updateOne.mock.calls.map((call) => call[1].$set);

    expect(response.status).toBe(502);
    expect(payload.status).toBe(ScheduleJobStatus.FAILED);
    expect(updates.some((u) => u.status === ScheduleJobStatus.FAILED)).toBe(true);
    expect(collections.schedules.insertOne).not.toHaveBeenCalled();
  });
});
