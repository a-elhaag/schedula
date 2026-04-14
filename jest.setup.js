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
  // Disable email sending in tests — prevents real ACS calls and test timeouts
  process.env.ACS_EMAIL_CONNECTION_STRING = '';
  process.env.ACS_EMAIL_FROM = '';
  // Disable dev-mode auth bypass so tests exercise real auth logic
  process.env.DEV_MODE = 'false';
  // Disable rate limiting so tests don't queue/block on Bottleneck reservoirs
  process.env.DISABLE_RATE_LIMIT = 'true';
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
 * Clear MongoDB collections after each test.
 * Guard: unit tests that mock @/lib/db return a mock db with no listCollections —
 * skip clearing in that case (the mock has no real data to clean up).
 */
afterEach(async () => {
  try {
    const { getDb } = await import('./lib/db');
    const db = await getDb();
    if (!db || typeof db.listCollections !== 'function') return;
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }
  } catch {
    // Swallow errors from mocked db instances — nothing to clean up
  }
});
