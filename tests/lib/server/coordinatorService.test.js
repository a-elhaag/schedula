import {
  getCoordinatorCourses,
  getCoordinatorRooms,
  getCoordinatorStaff,
} from "@/lib/server/coordinatorService";
import { getDb } from "@/lib/db";
import { mockDb, mockCollection, resetMocks } from "../../__mocks__/db";

jest.mock("@/lib/db");

describe("Coordinator Service", () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  const mockInstitutionId = "507f1f77bcf86cd799439011";
  const mockDepartmentId = "607f1f77bcf86cd799439011";

  describe("getCoordinatorCourses", () => {
    it("should fetch courses with pagination", async () => {
      const mockDbInstance = mockDb();
      const coursesCollection = mockCollection("courses");

      const mockCourses = [
        {
          _id: { toString: () => "courseId1" },
          code: "SET121",
          name: "Computer Architecture",
          credit_hours: 3,
          sections: [{ section_id: "SET121-lecture-1" }],
          created_at: new Date("2026-03-01"),
        },
        {
          _id: { toString: () => "courseId2" },
          code: "SET122",
          name: "Programming",
          credit_hours: 3,
          sections: [{ section_id: "SET122-lecture-1" }],
          created_at: new Date("2026-03-01"),
        },
      ];

      coursesCollection.find.mockReturnThis();
      coursesCollection.skip.mockReturnThis();
      coursesCollection.limit.mockReturnThis();
      coursesCollection.sort.mockReturnThis();
      coursesCollection.toArray.mockResolvedValue(mockCourses);
      coursesCollection.countDocuments = jest.fn().mockResolvedValue(25);

      mockDbInstance.collection.mockReturnValue(coursesCollection);
      getDb.mockResolvedValue(mockDbInstance);

      const result = await getCoordinatorCourses(mockInstitutionId, {
        limit: 10,
        skip: 0,
      });

      expect(result).toEqual({
        items: expect.arrayContaining([
          {
            id: "courseId1",
            code: "SET121",
            name: "Computer Architecture",
            credits: 3,
            sectionCount: 1,
            createdAt: expect.any(String),
          },
        ]),
        total: 25,
        skip: 0,
        limit: 10,
      });

      expect(coursesCollection.skip).toHaveBeenCalledWith(0);
      expect(coursesCollection.limit).toHaveBeenCalledWith(10);
      expect(coursesCollection.sort).toHaveBeenCalledWith({ code: 1 });
    });

    it("should filter courses by department", async () => {
      const mockDbInstance = mockDb();
      const coursesCollection = mockCollection("courses");

      coursesCollection.find.mockReturnThis();
      coursesCollection.skip.mockReturnThis();
      coursesCollection.limit.mockReturnThis();
      coursesCollection.sort.mockReturnThis();
      coursesCollection.toArray.mockResolvedValue([]);
      coursesCollection.countDocuments = jest.fn().mockResolvedValue(0);

      mockDbInstance.collection.mockReturnValue(coursesCollection);
      getDb.mockResolvedValue(mockDbInstance);

      await getCoordinatorCourses(mockInstitutionId, {
        departmentId: mockDepartmentId,
      });

      expect(coursesCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          department_id: expect.any(Object),
        }),
      );
    });

    it("should enforce limit cap and default skip", async () => {
      const mockDbInstance = mockDb();
      const coursesCollection = mockCollection("courses");

      coursesCollection.find.mockReturnThis();
      coursesCollection.skip.mockReturnThis();
      coursesCollection.limit.mockReturnThis();
      coursesCollection.sort.mockReturnThis();
      coursesCollection.toArray.mockResolvedValue([]);
      coursesCollection.countDocuments = jest.fn().mockResolvedValue(0);

      mockDbInstance.collection.mockReturnValue(coursesCollection);
      getDb.mockResolvedValue(mockDbInstance);

      await getCoordinatorCourses(mockInstitutionId, { limit: 1000 });

      expect(coursesCollection.limit).toHaveBeenCalledWith(500);
    });
  });

  describe("getCoordinatorRooms", () => {
    it("should fetch rooms with pagination", async () => {
      const mockDbInstance = mockDb();
      const roomsCollection = mockCollection("rooms");

      const mockRooms = [
        {
          _id: { toString: () => "roomId1" },
          label: "A202",
          name: "Room A202",
          building: "Building A",
          created_at: new Date("2026-03-01"),
        },
      ];

      roomsCollection.find.mockReturnThis();
      roomsCollection.skip.mockReturnThis();
      roomsCollection.limit.mockReturnThis();
      roomsCollection.sort.mockReturnThis();
      roomsCollection.toArray.mockResolvedValue(mockRooms);
      roomsCollection.countDocuments = jest.fn().mockResolvedValue(15);

      mockDbInstance.collection.mockReturnValue(roomsCollection);
      getDb.mockResolvedValue(mockDbInstance);

      const result = await getCoordinatorRooms(mockInstitutionId, {
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: "roomId1",
        label: "A202",
        name: "Room A202",
        building: "Building A",
      });
      expect(result.total).toBe(15);
    });

    it("should filter rooms by building", async () => {
      const mockDbInstance = mockDb();
      const roomsCollection = mockCollection("rooms");

      roomsCollection.find.mockReturnThis();
      roomsCollection.skip.mockReturnThis();
      roomsCollection.limit.mockReturnThis();
      roomsCollection.sort.mockReturnThis();
      roomsCollection.toArray.mockResolvedValue([]);
      roomsCollection.countDocuments = jest.fn().mockResolvedValue(0);

      mockDbInstance.collection.mockReturnValue(roomsCollection);
      getDb.mockResolvedValue(mockDbInstance);

      await getCoordinatorRooms(mockInstitutionId, { building: "Building A" });

      expect(roomsCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          building: "Building A",
        }),
      );
    });
  });

  describe("getCoordinatorStaff", () => {
    it("should fetch staff with pagination", async () => {
      const mockDbInstance = mockDb();
      const usersCollection = mockCollection("users");

      const mockStaff = [
        {
          _id: { toString: () => "staffId1" },
          name: "Dr. Mohammad Islam",
          email: "m.islam@university.edu",
          role: "professor",
          created_at: new Date("2026-03-01"),
        },
        {
          _id: { toString: () => "staffId2" },
          name: "Ahmed Hassan",
          email: "a.hassan@university.edu",
          role: "ta",
          created_at: new Date("2026-03-01"),
        },
      ];

      usersCollection.find.mockReturnThis();
      usersCollection.skip.mockReturnThis();
      usersCollection.limit.mockReturnThis();
      usersCollection.sort.mockReturnThis();
      usersCollection.toArray.mockResolvedValue(mockStaff);
      usersCollection.countDocuments = jest.fn().mockResolvedValue(20);

      mockDbInstance.collection.mockReturnValue(usersCollection);
      getDb.mockResolvedValue(mockDbInstance);

      const result = await getCoordinatorStaff(mockInstitutionId);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        id: "staffId1",
        name: "Dr. Mohammad Islam",
        role: "professor",
      });
      expect(result.total).toBe(20);
    });

    it("should filter staff by role", async () => {
      const mockDbInstance = mockDb();
      const usersCollection = mockCollection("users");

      usersCollection.find.mockReturnThis();
      usersCollection.skip.mockReturnThis();
      usersCollection.limit.mockReturnThis();
      usersCollection.sort.mockReturnThis();
      usersCollection.toArray.mockResolvedValue([]);
      usersCollection.countDocuments = jest.fn().mockResolvedValue(0);

      mockDbInstance.collection.mockReturnValue(usersCollection);
      getDb.mockResolvedValue(mockDbInstance);

      await getCoordinatorStaff(mockInstitutionId, { role: "professor" });

      expect(usersCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "professor",
        }),
      );
    });

    it("should exclude students and coordinators", async () => {
      const mockDbInstance = mockDb();
      const usersCollection = mockCollection("users");

      usersCollection.find.mockReturnThis();
      usersCollection.skip.mockReturnThis();
      usersCollection.limit.mockReturnThis();
      usersCollection.sort.mockReturnThis();
      usersCollection.toArray.mockResolvedValue([]);
      usersCollection.countDocuments = jest.fn().mockResolvedValue(0);

      mockDbInstance.collection.mockReturnValue(usersCollection);
      getDb.mockResolvedValue(mockDbInstance);

      await getCoordinatorStaff(mockInstitutionId);

      expect(usersCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          role: { $in: ["professor", "ta"] },
        }),
      );
    });
  });
});
