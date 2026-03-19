import { getStudentSchedule } from "@/lib/server/studentScheduleService";
import { getDb } from "@/lib/db";
import { mockDb, mockCollection, resetMocks } from "../../__mocks__/db";

jest.mock("@/lib/db");

describe("Student Schedule Service", () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  const mockInstitutionId = "507f1f77bcf86cd799439011";
  const mockCourseId = "607f1f77bcf86cd799439011";
  const mockRoomId = "707f1f77bcf86cd799439011";
  const mockStaffId = "807f1f77bcf86cd799439011";

  const mockSchedule = {
    _id: { toString: () => "scheduleId123" },
    institution_id: { toString: () => mockInstitutionId },
    term_label: "Spring 2026",
    approved_at: new Date("2026-03-15"),
    created_at: new Date("2026-03-10"),
    is_published: true,
    entries: [
      {
        course_id: { toString: () => mockCourseId },
        section_id: "SET121-lecture-1",
        room_id: { toString: () => mockRoomId },
        staff_id: { toString: () => mockStaffId },
        day: "Monday",
        start: "10:00",
        end: "11:00",
      },
      {
        course_id: { toString: () => mockCourseId },
        section_id: "SET121-lab-1",
        room_id: { toString: () => mockRoomId },
        staff_id: { toString: () => mockStaffId },
        day: "Sunday",
        start: "08:30",
        end: "09:30",
      },
    ],
  };

  const mockCourse = {
    _id: { toString: () => mockCourseId },
    code: "SET121",
    name: "Computer Architecture",
  };

  const mockRoom = {
    _id: { toString: () => mockRoomId },
    label: "A202",
  };

  const mockStaff = {
    _id: { toString: () => mockStaffId },
    name: "Dr. Mohammad Islam",
  };

  describe("getStudentSchedule", () => {
    it("should fetch and return formatted schedule", async () => {
      const mockDbInstance = mockDb();
      const schedulesCollection = mockCollection("schedules");
      const coursesCollection = mockCollection("courses");
      const roomsCollection = mockCollection("rooms");
      const staffCollection = mockCollection("users");

      schedulesCollection.find.mockReturnThis();
      schedulesCollection.sort.mockReturnThis();
      schedulesCollection.limit.mockReturnThis();
      schedulesCollection.next.mockResolvedValue(mockSchedule);

      coursesCollection.find.mockReturnThis();
      coursesCollection.toArray.mockResolvedValue([mockCourse]);

      roomsCollection.find.mockReturnThis();
      roomsCollection.toArray.mockResolvedValue([mockRoom]);

      staffCollection.find.mockReturnThis();
      staffCollection.toArray.mockResolvedValue([mockStaff]);

      mockDbInstance.collection.mockImplementation((name) => {
        switch (name) {
          case "schedules":
            return schedulesCollection;
          case "courses":
            return coursesCollection;
          case "rooms":
            return roomsCollection;
          case "users":
            return staffCollection;
          default:
            return mockCollection(name);
        }
      });

      getDb.mockResolvedValue(mockDbInstance);

      const result = await getStudentSchedule({
        institutionId: mockInstitutionId,
      });

      expect(result).toMatchObject({
        scheduleId: "scheduleId123",
        institutionId: mockInstitutionId,
        termLabel: "Spring 2026",
        isPublished: true,
        entryCount: 2,
        total: 2,
        limit: 50,
        skip: 0,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toMatchObject({
        day: "Sunday",
        courseCode: "SET121",
        courseName: "Computer Architecture",
        roomLabel: "A202",
        instructorName: "Dr. Mohammad Islam",
      });
    });

    it("should filter entries by day", async () => {
      const mockDbInstance = mockDb();
      const schedulesCollection = mockCollection("schedules");
      const coursesCollection = mockCollection("courses");
      const roomsCollection = mockCollection("rooms");
      const staffCollection = mockCollection("users");

      schedulesCollection.find.mockReturnThis();
      schedulesCollection.sort.mockReturnThis();
      schedulesCollection.limit.mockReturnThis();
      schedulesCollection.next.mockResolvedValue(mockSchedule);

      coursesCollection.find.mockReturnThis();
      coursesCollection.toArray.mockResolvedValue([mockCourse]);

      roomsCollection.find.mockReturnThis();
      roomsCollection.toArray.mockResolvedValue([mockRoom]);

      staffCollection.find.mockReturnThis();
      staffCollection.toArray.mockResolvedValue([mockStaff]);

      mockDbInstance.collection.mockImplementation((name) => {
        switch (name) {
          case "schedules":
            return schedulesCollection;
          case "courses":
            return coursesCollection;
          case "rooms":
            return roomsCollection;
          case "users":
            return staffCollection;
          default:
            return mockCollection(name);
        }
      });

      getDb.mockResolvedValue(mockDbInstance);

      const result = await getStudentSchedule({
        institutionId: mockInstitutionId,
        day: "Monday",
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].day).toBe("Monday");
      expect(result.total).toBe(1);
    });

    it("should filter entries by course code", async () => {
      const mockDbInstance = mockDb();
      const schedulesCollection = mockCollection("schedules");
      const coursesCollection = mockCollection("courses");
      const roomsCollection = mockCollection("rooms");
      const staffCollection = mockCollection("users");

      schedulesCollection.find.mockReturnThis();
      schedulesCollection.sort.mockReturnThis();
      schedulesCollection.limit.mockReturnThis();
      schedulesCollection.next.mockResolvedValue(mockSchedule);

      coursesCollection.find.mockReturnThis();
      coursesCollection.toArray.mockResolvedValue([mockCourse]);

      roomsCollection.find.mockReturnThis();
      roomsCollection.toArray.mockResolvedValue([mockRoom]);

      staffCollection.find.mockReturnThis();
      staffCollection.toArray.mockResolvedValue([mockStaff]);

      mockDbInstance.collection.mockImplementation((name) => {
        switch (name) {
          case "schedules":
            return schedulesCollection;
          case "courses":
            return coursesCollection;
          case "rooms":
            return roomsCollection;
          case "users":
            return staffCollection;
          default:
            return mockCollection(name);
        }
      });

      getDb.mockResolvedValue(mockDbInstance);

      const result = await getStudentSchedule({
        institutionId: mockInstitutionId,
        courseCode: "SET121",
      });

      expect(result.entries.every((e) => e.courseCode.includes("SET121"))).toBe(
        true,
      );
    });

    it("should return null when schedule not found", async () => {
      const mockDbInstance = mockDb();
      const schedulesCollection = mockCollection("schedules");

      schedulesCollection.find.mockReturnThis();
      schedulesCollection.sort.mockReturnThis();
      schedulesCollection.limit.mockReturnThis();
      schedulesCollection.next.mockResolvedValue(null);

      mockDbInstance.collection.mockReturnValue(schedulesCollection);
      getDb.mockResolvedValue(mockDbInstance);

      const result = await getStudentSchedule({
        institutionId: mockInstitutionId,
      });

      expect(result).toBeNull();
    });

    it("should apply pagination correctly", async () => {
      const mockDbInstance = mockDb();
      const schedulesCollection = mockCollection("schedules");
      const coursesCollection = mockCollection("courses");
      const roomsCollection = mockCollection("rooms");
      const staffCollection = mockCollection("users");

      const largeSchedule = {
        ...mockSchedule,
        entries: Array.from({ length: 30 }, (_, i) => ({
          ...mockSchedule.entries[0],
          day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"][
            i % 5
          ],
          start: `${8 + (i % 8)}:00`,
        })),
      };

      schedulesCollection.find.mockReturnThis();
      schedulesCollection.sort.mockReturnThis();
      schedulesCollection.limit.mockReturnThis();
      schedulesCollection.next.mockResolvedValue(largeSchedule);

      coursesCollection.find.mockReturnThis();
      coursesCollection.toArray.mockResolvedValue([mockCourse]);

      roomsCollection.find.mockReturnThis();
      roomsCollection.toArray.mockResolvedValue([mockRoom]);

      staffCollection.find.mockReturnThis();
      staffCollection.toArray.mockResolvedValue([mockStaff]);

      mockDbInstance.collection.mockImplementation((name) => {
        switch (name) {
          case "schedules":
            return schedulesCollection;
          case "courses":
            return coursesCollection;
          case "rooms":
            return roomsCollection;
          case "users":
            return staffCollection;
          default:
            return mockCollection(name);
        }
      });

      getDb.mockResolvedValue(mockDbInstance);

      const result = await getStudentSchedule({
        institutionId: mockInstitutionId,
        limit: 10,
        skip: 0,
      });

      expect(result.entries).toHaveLength(10);
      expect(result.total).toBe(30);
      expect(result.skip).toBe(0);
      expect(result.limit).toBe(10);
    });

    it("should throw error for invalid institution ID", async () => {
      const getDb_mock = getDb;
      getDb_mock.mockResolvedValue(mockDb());

      await expect(
        getStudentSchedule({
          institutionId: "invalid-id",
        }),
      ).rejects.toThrow("Invalid institutionId");
    });
  });
});
