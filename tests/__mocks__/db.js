/**
 * Mock MongoDB collection
 */
export const mockCollection = (name) => ({
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn(),
  insertOne: jest.fn(),
  insertMany: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  next: jest.fn(),
  toArray: jest.fn(),
  _name: name,
});

/**
 * Mock MongoDB database
 */
export const mockDb = () => ({
  collection: jest.fn(mockCollection),
});

/**
 * Helper to create mock ObjectId
 */
export const createMockId = (str = "507f1f77bcf86cd799439011") => ({
  toString: jest.fn(() => str),
  equals: jest.fn((other) => str === other.toString()),
  _id: str,
});

/**
 * Helper to reset all mocks
 */
export const resetMocks = () => {
  jest.clearAllMocks();
};
