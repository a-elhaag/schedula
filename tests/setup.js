// Jest setup file
jest.mock("@/lib/db");

// Mock Next.js NextResponse globally
jest.mock("next/server", () => ({
  NextResponse: {
    json: (data, init = {}) => ({
      json: async () => data,
      status: init.status || 200,
    }),
  },
}));

// Mock MongoDB ObjectId
jest.mock("mongodb", () => {
  const actual = jest.requireActual("mongodb");
  return {
    ...actual,
    ObjectId: class ObjectId {
      constructor(id) {
        this.id = id;
        this._id = id;
      }

      toString() {
        return this.id;
      }

      static isValid(id) {
        return (
          typeof id === "string" &&
          (id.length === 24 || /^[0-9a-f]{24}$/i.test(id))
        );
      }
    },
  };
});

// Global test utilities
global.testUtils = {
  createMockId: (str = "507f1f77bcf86cd799439011") => ({
    toString: jest.fn(() => str),
  }),

  createMockRequest: (url, options = {}) => ({
    url,
    method: options.method || "GET",
    headers: {
      get: jest.fn((name) => options.headers?.[name]),
      ...options.headers,
    },
    json: jest.fn(async () => options.body || {}),
  }),
};

