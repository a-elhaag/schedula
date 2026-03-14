/**
 * scripts/truncate-db.mjs
 *
 * Drop all collections from the Schedula database.
 * Run via: node --env-file=.env scripts/truncate-db.mjs
 */

import { client, DB_NAME } from "./db/client.mjs";

async function truncateDatabase() {
  try {
    console.log("\n🔌  Connecting to MongoDB…");
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅  Connected.\n");

    const db = client.db(DB_NAME);
    console.log(`🗑️  Truncating database: ${DB_NAME}\n`);

    const collections = await db.listCollections().toArray();
    let dropped = 0;

    for (const col of collections) {
      await db.collection(col.name).deleteMany({});
      console.log(`  ✓ Cleared: ${col.name}`);
      dropped++;
    }

    console.log(
      `\n─────────────────────────────────────────\n✅  ${dropped} collection(s) cleared successfully.\n`
    );
  } catch (err) {
    console.error("\n❌  Truncate failed:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

truncateDatabase();
