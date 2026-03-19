import { GET as getCoursesRoute } from "@/app/api/coordinator/courses/route";
import { GET as getRoomsRoute } from "@/app/api/coordinator/rooms/route";
import { GET as getStaffRoute } from "@/app/api/coordinator/staff/route";
import { getCoordinatorCourses } from "@/lib/server/coordinatorService";
import { getCoordinatorRooms } from "@/lib/server/coordinatorService";
import { getCoordinatorStaff } from "@/lib/server/coordinatorService";
import { getCurrentUser } from "@/lib/server/auth";

jest.mock("@/lib/server/coordinatorService");
jest.mock("@/lib/server/auth");

describe("Coordinator API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    userId: "coordinator1",
    role: "coordinator",
    institutionId: "inst123",
  };

  describe("GET /api/coordinator/courses", () => {
    it("should return courses data", async () => {
      const mockCoursesData = {
        items: [
          {
            id: "course1",
            code: "SET121",
            name: "Computer Architecture",
            credits: 3,
            sectionCount: 2,
          },
        ],
        total: 1,
        skip: 0,
        limit: 100,
      };

      getCurrentUser.mockResolvedValue(mockUser);
      getCoordinatorCourses.mockResolvedValue(mockCoursesData);

      const request = new Request(
        "http://localhost/api/coordinator/courses?limit=100",
      );

      const response = await getCoursesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual(mockCoursesData);
      expect(getCoordinatorCourses).toHaveBeenCalledWith("inst123", {
        departmentId: undefined,
        limit: 100,
        skip: 0,
      });
    });

    it("should apply department filter", async () => {
      getCurrentUser.mockResolvedValue(mockUser);
      getCoordinatorCourses.mockResolvedValue({
        items: [],
        total: 0,
        skip: 0,
        limit: 100,
      });

      const request = new Request(
        "http://localhost/api/coordinator/courses?departmentId=dept123",
      );

      await getCoursesRoute(request);

      expect(getCoordinatorCourses).toHaveBeenCalledWith("inst123", {
        departmentId: "dept123",
        limit: 100,
        skip: 0,
      });
    });

    it("should cap limit at 500", async () => {
      getCurrentUser.mockResolvedValue(mockUser);
      getCoordinatorCourses.mockResolvedValue({
        items: [],
        total: 0,
        skip: 0,
        limit: 500,
      });

      const request = new Request(
        "http://localhost/api/coordinator/courses?limit=1000",
      );

      await getCoursesRoute(request);

      expect(getCoordinatorCourses).toHaveBeenCalledWith("inst123", {
        departmentId: undefined,
        limit: 500,
        skip: 0,
      });
    });
  });

  describe("GET /api/coordinator/rooms", () => {
    it("should return rooms data", async () => {
      const mockRoomsData = {
        items: [
          {
            id: "room1",
            label: "A202",
            name: "Room A202",
            building: "Building A",
          },
        ],
        total: 1,
        skip: 0,
        limit: 100,
      };

      getCurrentUser.mockResolvedValue(mockUser);
      getCoordinatorRooms.mockResolvedValue(mockRoomsData);

      const request = new Request(
        "http://localhost/api/coordinator/rooms?limit=100",
      );

      const response = await getRoomsRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("should apply building filter", async () => {
      getCurrentUser.mockResolvedValue(mockUser);
      getCoordinatorRooms.mockResolvedValue({
        items: [],
        total: 0,
        skip: 0,
        limit: 100,
      });

      const request = new Request(
        "http://localhost/api/coordinator/rooms?building=Building%20A",
      );

      await getRoomsRoute(request);

      expect(getCoordinatorRooms).toHaveBeenCalledWith("inst123", {
        building: "Building A",
        limit: 100,
        skip: 0,
      });
    });
  });

  describe("GET /api/coordinator/staff", () => {
    it("should return staff data", async () => {
      const mockStaffData = {
        items: [
          {
            id: "staff1",
            name: "Dr. Mohammad",
            email: "m.mohammad@university.edu",
            role: "professor",
          },
        ],
        total: 1,
        skip: 0,
        limit: 100,
      };

      getCurrentUser.mockResolvedValue(mockUser);
      getCoordinatorStaff.mockResolvedValue(mockStaffData);

      const request = new Request(
        "http://localhost/api/coordinator/staff?limit=100",
      );

      const response = await getStaffRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual(mockStaffData);
    });

    it("should filter staff by role", async () => {
      getCurrentUser.mockResolvedValue(mockUser);
      getCoordinatorStaff.mockResolvedValue({
        items: [],
        total: 0,
        skip: 0,
        limit: 100,
      });

      const request = new Request(
        "http://localhost/api/coordinator/staff?role=professor",
      );

      await getStaffRoute(request);

      expect(getCoordinatorStaff).toHaveBeenCalledWith("inst123", {
        role: "professor",
        limit: 100,
        skip: 0,
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 400 for validation errors", async () => {
      const error = new Error("Invalid department ID");
      error.status = 400;

      getCurrentUser.mockResolvedValue(mockUser);
      getCoordinatorCourses.mockRejectedValue(error);

      const request = new Request(
        "http://localhost/api/coordinator/courses",
      );

      const response = await getCoursesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });

    it("should handle auth errors", async () => {
      getCurrentUser.mockRejectedValue(new Error("No user found"));

      const request = new Request(
        "http://localhost/api/coordinator/courses",
      );

      const response = await getCoursesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });
});
