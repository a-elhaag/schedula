import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'schedula';

if (!uri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // Reuse connection across hot reloads in dev
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export { dbName };
export default clientPromise;

/**
 * Helper — resolves the connected client and returns the db handle.
 * @param {string} [name] - Override the default database name.
 */
export async function getDb(name) {
  const client = await clientPromise;
  return client.db(name ?? dbName);
}
