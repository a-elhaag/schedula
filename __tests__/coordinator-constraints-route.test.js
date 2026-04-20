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
const { GET, POST } = require("@/app/api/coordinator/constraints/route");

describe("/api/coordinator/constraints", () => {
  const institutionObjectId = new ObjectId("669b538e5aa373449d761b12");

  beforeEach(() => {
    jest.resetAllMocks();
    getCurrentUser.mockReturnValue({
      userId: "669b538e5aa373449d761b13",
      institutionId: "669b538e5aa373449d761b12",
    });
    resolveInstitutionId.mockResolvedValue(institutionObjectId);
  });

  it("GET returns stored hard/soft constraints", async () => {
    const constraintsCollection = {
      findOne: jest.fn().mockResolvedValue({
        hard: { no_room_overlap: true },
        soft: { minimize_gaps: 60 },
        updated_at: new Date("2026-04-20T09:00:00.000Z"),
      }),
    };
    getDb.mockResolvedValue({
      collection: () => constraintsCollection,
    });

    const req = new Request("http://localhost/api/coordinator/constraints", { method: "GET" });
    const response = await GET(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.hard.no_room_overlap).toBe(true);
    expect(payload.soft.minimize_gaps).toBe(60);
  });

  it("POST upserts constraints", async () => {
    const constraintsCollection = {
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    getDb.mockResolvedValue({
      collection: () => constraintsCollection,
    });

    const req = new Request("http://localhost/api/coordinator/constraints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hard: { no_room_overlap: true },
        soft: { minimize_gaps: 50 },
      }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(constraintsCollection.updateOne).toHaveBeenCalled();
  });
});
