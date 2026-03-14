import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
export const DB_NAME = process.env.MONGODB_DB ?? 'schedula';

if (!uri || uri.includes('<db_password>')) {
  console.error('\n❌  MONGODB_URI is missing or still contains the placeholder password.');
  console.error('    Update .env with your real Atlas password and re-run.\n');
  process.exit(1);
}

export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
