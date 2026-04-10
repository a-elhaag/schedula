/**
 * scripts/restore-data.mjs
 *
 * Restores all data from data/full-export.json into the new MongoDB cluster.
 * Preserves original _id values (converted back to ObjectId where applicable).
 *
 * Run via: node --env-file=.env scripts/restore-data.mjs
 *
 * Options:
 *   --dry-run   Print what would be inserted without writing to DB
 *   --drop      Drop existing collections before restoring (full wipe)
 */

import { client, DB_NAME } from "./db/client.mjs";
import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.argv.includes("--dry-run");
const DROP_FIRST = process.argv.includes("--drop");

// Collections to restore (empty collections are skipped automatically)
const ORDERED_COLLECTIONS = [
  "institutions",
  "faculties",
  "departments",
  "users",
  "rooms",
  "courses",
  "availability",
  "constraints",
  "schedules",
  "schedule_snapshots",
  "schedule_jobs",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively convert 24-char hex strings that look like ObjectIds
 * into actual ObjectId instances so MongoDB stores them correctly.
 */
function reviveObjectIds(value) {
  if (Array.isArray(value)) {
    return value.map(reviveObjectIds);
  }
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = reviveObjectIds(v);
    }
    return out;
  }
  if (typeof value === "string" && /^[0-9a-f]{24}$/i.test(value)) {
    return new ObjectId(value);
  }
  return value;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const exportPath = path.resolve(__dirname, "../data/full-export.json");

  if (!fs.existsSync(exportPath)) {
    console.error(`\n❌  Export file not found: ${exportPath}`);
    console.error("    Run export-data.mjs first, or check the path.\n");
    process.exit(1);
  }

  console.log("\n📂  Reading export file…");
  const raw = fs.readFileSync(exportPath, "utf-8");
  const exportData = JSON.parse(raw);
  console.log(`✅  Loaded export (${(raw.length / 1024).toFixed(1)} KB)\n`);

  if (DRY_RUN) {
    console.log("🔍  DRY RUN — no data will be written.\n");
  }

  if (!DRY_RUN) {
    console.log("🔌  Connecting to MongoDB…");
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(`✅  Connected to: ${DB_NAME}\n`);
  }

  const db = DRY_RUN ? null : client.db(DB_NAME);

  // Build restore order: use ORDERED_COLLECTIONS, then append any extras found in export
  const exportedCollections = Object.keys(exportData);
  const restoreOrder = [
    ...ORDERED_COLLECTIONS.filter((c) => exportedCollections.includes(c)),
    ...exportedCollections.filter((c) => !ORDERED_COLLECTIONS.includes(c)),
  ];

  const results = {};

  for (const collName of restoreOrder) {
    const docs = exportData[collName];

    if (!docs || docs.length === 0) {
      console.log(`  ⏭  ${collName.padEnd(25)} (empty — skipped)`);
      results[collName] = { inserted: 0, skipped: true };
      continue;
    }

    // Revive ObjectIds
    const revived = reviveObjectIds(docs);

    if (DRY_RUN) {
      console.log(
        `  ✓ ${collName.padEnd(25)} ${docs.length} document${docs.length !== 1 ? "s" : ""} (dry run)`,
      );
      results[collName] = { inserted: docs.length, skipped: false };
      continue;
    }

    // Drop collection first if requested
    if (DROP_FIRST) {
      await db.collection(collName).drop().catch(() => {}); // ignore if not exists
    }

    try {
      const res = await db.collection(collName).insertMany(revived, {
        ordered: false, // continue even if some docs already exist
      });
      console.log(
        `  ✓ ${collName.padEnd(25)} ${res.insertedCount} inserted`,
      );
      results[collName] = { inserted: res.insertedCount, skipped: false };
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key — some or all docs already exist
        const inserted = err.result?.nInserted ?? "?";
        console.warn(
          `  ⚠  ${collName.padEnd(25)} ${inserted} inserted (some duplicates skipped)`,
        );
        results[collName] = { inserted, skipped: false };
      } else {
        console.error(`  ❌  ${collName}: ${err.message}`);
        results[collName] = { inserted: 0, error: err.message };
      }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────");
  console.log("📊  Restore Summary:\n");

  let totalInserted = 0;
  for (const [coll, stat] of Object.entries(results)) {
    if (stat.skipped) continue;
    totalInserted += typeof stat.inserted === "number" ? stat.inserted : 0;
    const label = stat.error ? `❌  error: ${stat.error}` : `✅  ${stat.inserted} inserted`;
    console.log(`   ${coll.padEnd(25)} ${label}`);
  }

  console.log(`\n   Total documents restored: ${totalInserted}`);
  console.log("─────────────────────────────────────────\n");

  if (DRY_RUN) {
    console.log("✅  Dry run complete. Re-run without --dry-run to apply.\n");
  } else {
    console.log("✅  Restore complete.\n");
    console.log("💡  Next steps:");
    console.log("   1. Update MONGODB_URI in .env to point to your new cluster");
    console.log("   2. Run: node --env-file=.env scripts/create-indexes.mjs");
    console.log("   3. Verify: node --env-file=.env scripts/check-db.mjs\n");
  }
}

main()
  .catch((err) => {
    console.error("\n❌  Restore failed:", err.message, "\n");
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    if (!DRY_RUN) client.close();
  });
