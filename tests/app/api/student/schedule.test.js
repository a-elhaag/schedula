import { GET as getStudentScheduleRoute } from "@/app/api/student/schedule/route";
import { getStudentSchedule } from "@/lib/server/studentScheduleService";

jest.mock("@/lib/server/studentScheduleService");

describe("Student Schedule API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return schedule data on success", async () => {
    const mockScheduleData = {
      scheduleId: "scheduleId123",
      institutionId: "inst123",
      termLabel: "Spring 2026",
      isPublished: true,
      entryCount: 2,
      total: 2,
      limit: 50,
      skip: 0,
      entries: [
        {
          id: "entry1",
          day: "Monday",
          start: "10:00",
          end: "11:00",
          courseCode: "SET121",
          courseName: "Computer Architecture",
        },
      ],
    };

    getStudentSchedule.mockResolvedValue(mockScheduleData);

    const request = new Request(
      "http://localhost/api/student/schedule?institutionId=inst123&term=Spring%202026",
    );

    const response = await getStudentScheduleRoute(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.data).toEqual(mockScheduleData);
    expect(getStudentSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: "inst123",
        termLabel: "Spring 2026",
      }),
    );
  });

  it("should parse day filter parameter", async () => {
    getStudentSchedule.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/student/schedule?day=Monday",
    );

    await getStudentScheduleRoute(request);

    expect(getStudentSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        day: "Monday",
      }),
    );
  });

  it("should parse course code filter parameter", async () => {
    getStudentSchedule.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/student/schedule?courseCode=SET121",
    );

    await getStudentScheduleRoute(request);

    expect(getStudentSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        courseCode: "SET121",
      }),
    );
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
