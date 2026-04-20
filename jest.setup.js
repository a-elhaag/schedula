/**
 * Jest Setup File
 * Configures test environment including in-memory MongoDB for integration tests
 */

let mongoServer;
const shouldSkipMongoSetup = process.env.JEST_SKIP_MONGO_SETUP === 'true';

if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = (id) => clearTimeout(id);
}

/**
 * Start in-memory MongoDB server before all tests
 */
beforeAll(async () => {
  if (shouldSkipMongoSetup) return;
  if (process.env.JEST_MONGO_MANAGED_URI === 'true' && process.env.MONGODB_URI) return;
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JEST_MONGO_MANAGED_URI = 'true';
  process.env.MONGODB_DB = 'schedula-test';
  // Disable email sending in tests — prevents real ACS calls and test timeouts
  process.env.ACS_EMAIL_CONNECTION_STRING = '';
  process.env.ACS_EMAIL_FROM = '';
  // Disable dev-mode auth bypass so tests exercise real auth logic
  process.env.DEV_MODE = 'false';
  // Disable rate limiting so tests don't queue/block on Bottleneck reservoirs
  process.env.DISABLE_RATE_LIMIT = 'true';
}, 300000);

/**
 * Stop in-memory MongoDB server after all tests
 */
afterAll(async () => {
  if (shouldSkipMongoSetup) return;
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
  if (shouldSkipMongoSetup) return;
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
