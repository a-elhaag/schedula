/**
 * Jest Setup File
 * Configures test environment including in-memory MongoDB for integration tests
 */

let mongoServer;

/**
 * Start in-memory MongoDB server before all tests
 */
beforeAll(async () => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.MONGODB_DB = 'schedula-test';
}, 60000);

/**
 * Stop in-memory MongoDB server after all tests
 */
afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

/**
 * Clear MongoDB collections after each test
 */
afterEach(async () => {
  const { getDb } = await import('./lib/db');
  const db = await getDb();
  const collections = await db.listCollections().toArray();

  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
});
