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
    it("should return user from proxy headers", () => {
      const coordinatorId = "507f1f77bcf86cd799439011";
      const institutionId = "507f1f77bcf86cd799439012";

      const headers = new Headers();
      headers.set("x-user-id", coordinatorId);
      headers.set("x-user-role", "coordinator");
      headers.set("x-user-email", "test@example.com");
      headers.set("x-user-institution", institutionId);

      const request = new Request("http://localhost/api/test", { headers });
      const user = getCurrentUser(request);

      expect(user).toEqual({
        userId: coordinatorId,
        role: "coordinator",
        email: "test@example.com",
        institutionId,
      });
    });

    it("should throw a 401 error when no auth context is found", () => {
      const request = new Request("http://localhost/api/test");

      expect(() => getCurrentUser(request)).toThrow("Unauthorized.");
    });
    
    it("should enforce requiredRole", () => {
      const headers = new Headers();
      headers.set("x-user-id", "test-id");
      headers.set("x-user-role", "student");

      const request = new Request("http://localhost/api/test", { headers });

      expect(() => getCurrentUser(request, { requiredRole: "coordinator" })).toThrow("Forbidden. Insufficient permissions.");
    });
  });
});
