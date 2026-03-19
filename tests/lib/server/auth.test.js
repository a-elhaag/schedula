import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { mockDb, mockCollection, resetMocks } from "../../__mocks__/db";

jest.mock("@/lib/db");

describe("Auth Utility", () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should return current user from database", async () => {
      const coordinatorId = "507f1f77bcf86cd799439011";
      const institutionId = "507f1f77bcf86cd799439012";

      const mockDbInstance = mockDb();
      const usersCollection = mockCollection("users");
      usersCollection.findOne.mockResolvedValue({
        _id: { toString: () => coordinatorId },
        institution_id: { toString: () => institutionId },
        role: "coordinator",
      });

      mockDbInstance.collection.mockReturnValue(usersCollection);
      getDb.mockResolvedValue(mockDbInstance);

      const request = new Request("http://localhost/api/test");
      const user = await getCurrentUser(request);

      expect(user).toEqual({
        userId: coordinatorId,
        role: "coordinator",
        institutionId,
      });
      expect(usersCollection.findOne).toHaveBeenCalledWith(
        { role: "coordinator" },
        { projection: { _id: 1, institution_id: 1 } },
      );
    });

    it("should throw error when no coordinator found", async () => {
      const mockDbInstance = mockDb();
      const usersCollection = mockCollection("users");
      usersCollection.findOne.mockResolvedValue(null);

      mockDbInstance.collection.mockReturnValue(usersCollection);
      getDb.mockResolvedValue(mockDbInstance);

      const request = new Request("http://localhost/api/test");

      await expect(getCurrentUser(request)).rejects.toThrow(
        "No coordinator user found",
      );
    });
  });
});
