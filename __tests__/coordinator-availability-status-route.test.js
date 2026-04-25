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
const { GET } = require("@/app/api/coordinator/availability/status/route");

describe("/api/coordinator/availability/status", () => {
  const institutionObjectId = new ObjectId("669b538e5aa373449d761b12");

  beforeEach(() => {
    jest.resetAllMocks();
    getCurrentUser.mockReturnValue({
      userId: "669b538e5aa373449d761b13",
      institutionId: "669b538e5aa373449d761b12",
    });
    resolveInstitutionId.mockResolvedValue(institutionObjectId);
  });

  it("GET returns enriched staff availability stats", async () => {
    const users = [
      {
        _id: new ObjectId("669b538e5aa373449d761c11"),
        name: "Prof Ada",
        email: "ada@example.com",
        role: "professor",
      },
      {
        _id: new ObjectId("669b538e5aa373449d761c12"),
        name: "TA Grace",
        email: "grace@example.com",
        role: "ta",
      },
    ];

    const submissions = [
      {
        user_id: users[0]._id,
        slots: [{ day: "Monday", slot: "09:00" }],
        submitted_at: new Date("2026-04-20T08:00:00.000Z"),
      },
    ];

    const db = {
      collection: (name) => {
        if (name === "institutions") {
          return {
            findOne: jest.fn().mockResolvedValue({
              _id: institutionObjectId,
              active_term: { label: "Spring 2026" },
            }),
          };
        }
        if (name === "users") {
          return {
            find: jest.fn(() => ({
              sort: jest.fn(() => ({
                toArray: jest.fn().mockResolvedValue(users),
              })),
            })),
          };
        }
        if (name === "availability") {
          return {
            find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(submissions) })),
          };
        }
        throw new Error(`Unknown collection ${name}`);
      },
    };

    getDb.mockResolvedValue(db);

    const req = new Request("http://localhost/api/coordinator/availability/status", { method: "GET" });
    const response = await GET(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.staff).toHaveLength(2);
    expect(payload.stats.submitted).toBe(1);
    expect(payload.stats.missing).toBe(1);
  });
});
