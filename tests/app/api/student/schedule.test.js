import { GET as getStudentScheduleRoute } from "@/app/api/student/schedule/route";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";

jest.mock("@/lib/server/auth");
jest.mock("@/lib/db");

describe("Student Schedule API Route", () => {
  let mockDb;
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    // Build a chainable mock collection
    mockCollection = {
      findOne: jest.fn(),
      find:    jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    };

    mockDb = { collection: jest.fn(() => mockCollection) };
    getDb.mockResolvedValue(mockDb);

    // Default: authenticated student
    getCurrentUser.mockReturnValue({ userId: "507f1f77bcf86cd799439011", role: "student" });
  });

  it("should return 404 when user not found in DB", async () => {
    mockCollection.findOne.mockResolvedValue(null); // user not found

    const request = new Request("http://localhost/api/student/schedule");
    const response = await getStudentScheduleRoute(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return schedule message when no schedule exists for term", async () => {
    const mockUser = {
      _id: "507f1f77bcf86cd799439011",
      institution_id: "507f1f77bcf86cd799439012",
      name: "Test Student",
      email: "student@test.com",
      role: "student",
      enrollment_ids: [],
    };

    // first call: user, second: institution, rest: no schedule
    mockCollection.findOne
      .mockResolvedValueOnce(mockUser)       // user
      .mockResolvedValueOnce({ active_term: { label: "Spring 2026" } }) // institution
      .mockResolvedValueOnce(null)           // published schedule
      .mockResolvedValueOnce(null);          // any schedule (dev fallback)

    const request = new Request("http://localhost/api/student/schedule");
    const response = await getStudentScheduleRoute(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("No schedule found");
  });

  it("should return 401 when not authenticated", async () => {
    getCurrentUser.mockImplementation(() => {
      const err = new Error("Unauthorized.");
      err.status = 401;
      throw err;
    });

    const request = new Request("http://localhost/api/student/schedule");
    const response = await getStudentScheduleRoute(request);

    expect(response.status).toBe(401);
  });
});
