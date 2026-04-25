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
const { GET, PUT } = require("@/app/api/coordinator/assign/route");

describe("/api/coordinator/assign", () => {
  const institutionObjectId = new ObjectId("669b538e5aa373449d761b12");

  beforeEach(() => {
    jest.resetAllMocks();
    getCurrentUser.mockReturnValue({
      userId: "669b538e5aa373449d761b13",
      institutionId: "669b538e5aa373449d761b12",
    });
    resolveInstitutionId.mockResolvedValue(institutionObjectId);
  });

  it("GET returns courses and staff list", async () => {
    const staffId = new ObjectId("669b538e5aa373449d761d11");
    const courseId = new ObjectId("669b538e5aa373449d761d12");

    const db = {
      collection: (name) => {
        if (name === "courses") {
          return {
            find: jest.fn(() => ({
              sort: jest.fn(() => ({
                project: jest.fn(() => ({
                  toArray: jest.fn().mockResolvedValue([
                    {
                      _id: courseId,
                      code: "CS101",
                      name: "Intro",
                      credit_hours: 3,
                      sections: ["G1"],
                      assigned_staff: [staffId],
                    },
                  ]),
                })),
              })),
            })),
          };
        }
        if (name === "users") {
          return {
            find: jest.fn(() => ({
              sort: jest.fn(() => ({
                project: jest.fn(() => ({
                  toArray: jest.fn().mockResolvedValue([
                    {
                      _id: staffId,
                      name: "Prof Ada",
                      email: "ada@example.com",
                      role: "professor",
                    },
                  ]),
                })),
              })),
            })),
          };
        }
        throw new Error(`Unknown collection ${name}`);
      },
    };

    getDb.mockResolvedValue(db);

    const req = new Request("http://localhost/api/coordinator/assign", { method: "GET" });
    const response = await GET(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.courses).toHaveLength(1);
    expect(payload.staff).toHaveLength(1);
    expect(payload.courses[0].assignedStaff[0]).toBe(staffId.toString());
  });

  it("PUT validates action and returns 400 for unknown action", async () => {
    getDb.mockResolvedValue({ collection: jest.fn() });

    const req = new Request("http://localhost/api/coordinator/assign", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: new ObjectId("669b538e5aa373449d761d21").toString(),
        staffId: new ObjectId("669b538e5aa373449d761d22").toString(),
        action: "invalid",
      }),
    });

    const response = await PUT(req);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain("action must be");
  });
});
