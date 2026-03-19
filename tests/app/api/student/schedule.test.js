import { GET as getStudentScheduleRoute } from "@/app/api/student/schedule/route";

describe("Student Schedule API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a not-found message when no schedule exists for the term", async () => {
    const request = new Request(
      "http://localhost/api/student/schedule?userId=user123&institutionId=inst123&term=Spring%202026",
    );

    const response = await getStudentScheduleRoute(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty("message", "No schedule found for this term yet");
  });

  it("should return a validation error when userId is missing", async () => {
    const request = new Request(
      "http://localhost/api/student/schedule?institutionId=inst123&term=Spring%202026",
    );

    const response = await getStudentScheduleRoute(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("message");
    expect(typeof data.message).toBe("string");
  });

  it("should handle optional day filter parameter without error", async () => {
    const request = new Request(
      "http://localhost/api/student/schedule?userId=user123&day=Monday",
    );

    const response = await getStudentScheduleRoute(request);

    expect(response.status).not.toBe(500);
  });

  it("should handle optional course code filter parameter without error", async () => {
    const request = new Request(
      "http://localhost/api/student/schedule?userId=user123&courseCode=SET121",
    );

    const response = await getStudentScheduleRoute(request);

    expect(response.status).not.toBe(500);
  });

  it("should parse pagination parameters with limits", async () => {
    getStudentSchedule.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/student/schedule?limit=1000&skip=100",
    );

    await getStudentScheduleRoute(request);

    expect(getStudentSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 500, // capped at 500
        skip: 100,
      }),
    );
  });

  it("should return 404 when schedule not found", async () => {
    getStudentSchedule.mockResolvedValue(null);

    const request = new Request("http://localhost/api/student/schedule");

    const response = await getStudentScheduleRoute(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.ok).toBe(false);
    expect(data.error.message).toBe("No schedule found");
  });

  it("should catch and handle service errors", async () => {
    getStudentSchedule.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new Request("http://localhost/api/student/schedule");

    const response = await getStudentScheduleRoute(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error.message).toBe("Internal server error");
  });

  it("should handle validation errors with 400 status", async () => {
    const error = new Error("Invalid institutionId");
    error.status = 400;
    getStudentSchedule.mockRejectedValue(error);

    const request = new Request("http://localhost/api/student/schedule");

    const response = await getStudentScheduleRoute(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error.message).toBe("Invalid institutionId");
  });
});
