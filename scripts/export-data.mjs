/**
 * scripts/export-data.mjs
 *
 * Exports all data from MongoDB collections to JSON files.
 * Run via: node --env-file=.env scripts/export-data.mjs
 *
 * Creates:
 * - data/collections-summary.json (overview of each collection)
 * - data/full-export.json (complete dump of all data)
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import fs from "fs";
import path from "path";

// ─── Config ───────────────────────────────────────────────────────────────────

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB ?? "schedula";

if (!uri || uri.includes("<db_password>")) {
  console.error(
    "\n❌  MONGODB_URI is missing or still contains the placeholder password.",
  );
  console.error("    Update .env with your real Atlas password and re-run.\n");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function ensureDataDir() {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

function formatDate(date) {
  if (date instanceof Date) {
    return date.toISOString();
  }
  return date;
}

function replacer(key, value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔌  Connecting to MongoDB Atlas…");
  await client.connect();

  // Verify connectivity
  await client.db("admin").command({ ping: 1 });
  console.log("✅  Connected.\n");

  const db = client.db(DB_NAME);
  const dataDir = ensureDataDir();

  // Get all collections
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name).sort();

  console.log(`📦  Database: ${DB_NAME}`);
  console.log(`📊  Found ${collectionNames.length} collections\n`);

  const summary = {};
  const fullExport = {};

  // Export each collection
  for (const collName of collectionNames) {
    const col = db.collection(collName);
    const docs = await col.find({}).toArray();

    summary[collName] = {
      count: docs.length,
      sample: docs.length > 0 ? docs[0] : null,
    };

    fullExport[collName] = docs;

    console.log(
      `  ✓ ${collName.padEnd(25)} ${docs.length} document${docs.length !== 1 ? "s" : ""}`,
    );
  }

  // Write summary file
  const summaryPath = path.join(dataDir, "collections-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, replacer, 2));
  console.log(`\n📄  Summary: ${summaryPath}`);

  // Write full export file
  const fullExportPath = path.join(dataDir, "full-export.json");
  fs.writeFileSync(fullExportPath, JSON.stringify(fullExport, replacer, 2));
  console.log(`📄  Full export: ${fullExportPath}`);

  console.log("\n─────────────────────────────────────────");
  const totalDocs = Object.values(summary).reduce((sum, c) => sum + c.count, 0);
  console.log(`  Total documents: ${totalDocs}`);
  console.log("─────────────────────────────────────────\n");
  console.log("✅  Data export completed.\n");
}

main()
  .catch((err) => {
    console.error("\n❌  Export failed:", err.message, "\n");
    process.exit(1);
  })
  .finally(() => client.close());
