import { MongoClient, ServerApiVersion } from "mongodb";

const dbName = process.env.MONGODB_DB ?? "schedula";

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let clientPromise;

function createClientPromise() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  const client = new MongoClient(uri, options);
  return client.connect();
}

export function getClientPromise() {
  if (process.env.NODE_ENV === "development") {
    // Reuse connection across hot reloads in dev
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = createClientPromise();
  }

  return clientPromise;
}

const lazyClientPromise = {
  then(onFulfilled, onRejected) {
    return getClientPromise().then(onFulfilled, onRejected);
  },
  catch(onRejected) {
    return getClientPromise().catch(onRejected);
  },
  finally(onFinally) {
    return getClientPromise().finally(onFinally);
  },
};

export { dbName };
export default lazyClientPromise;

/**
 * Helper — resolves the connected client and returns the db handle.
 * @param {string} [name] - Override the default database name.
 */
export async function getDb(name) {
  const client = await getClientPromise();
  return client.db(name ?? dbName);
}
