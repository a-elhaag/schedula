// scripts/migrate-schema.mjs
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB ?? "schedula";

const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } });

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);

  // ── 1. Migrate courses ──────────────────────────────────────────────────────
  console.log("Migrating courses...");
  const courses = await db.collection("courses").find({}).toArray();
  let migrated = 0;

  for (const course of courses) {
    const sections = course.sections ?? [];
    const types = sections.map(s => s.type ?? "lecture");

    const has_lecture  = types.includes("lecture") || sections.length === 0;
    const has_lab      = types.includes("lab");
    const has_tutorial = types.includes("tutorial");
    const has_tut_lab  = false;

    const level = course.level
      ?? sections[0]?.year_levels?.[0]
      ?? 1;

    await db.collection("courses").updateOne(
      { _id: course._id },
      {
        $set: {
          level,
          has_lecture,
          has_tutorial,
          has_lab,
          has_tut_lab,
          groups_per_lecture: 1,
          professor_id: null,
          ta_ids: [],
        },
        $unset: { sections: "" },
      }
    );
    migrated++;
  }
  console.log(`  ✅ ${migrated} courses migrated`);

  // ── 2. Migrate availability ─────────────────────────────────────────────────
  console.log("Migrating availability...");
  const avail = await db.collection("availability").find({}).toArray();
  let availMigrated = 0;

  for (const doc of avail) {
    if (Array.isArray(doc.slots)) {
      const available_days = [...new Set(doc.slots.map(s => s.day).filter(Boolean))];
      await db.collection("availability").updateOne(
        { _id: doc._id },
        {
          $set: { available_days },
          $unset: { slots: "", day_off: "", preferred_break: "" },
        }
      );
      availMigrated++;
    }
  }
  console.log(`  ✅ ${availMigrated} availability docs migrated`);

  // ── 3. Migrate settings groups → levels_config ──────────────────────────────
  console.log("Migrating groups settings...");
  const groupSettings = await db.collection("settings").findOne({ type: "groups" });
  if (groupSettings) {
    const d = groupSettings.data ?? {};
    const levels = [];

    if (d.level_1 > 0) {
      const groups = [];
      for (let g = 1; g <= d.level_1; g++) {
        groups.push({ group_id: `G${g}`, subgroup_count: 3 });
      }
      levels.push({ level: 1, label: "Level 1", groups });
    }
    if (d.level_2 > 0) {
      const groups = [];
      for (let g = 1; g <= d.level_2; g++) {
        groups.push({ group_id: `G${g}`, subgroup_count: 3 });
      }
      levels.push({ level: 2, label: "Level 2", groups });
    }
    if (d.level_3 > 0) {
      const groups = [];
      for (let g = 1; g <= d.level_3; g++) {
        groups.push({ group_id: `G${g}`, subgroup_count: g === 2 ? 2 : 3 });
      }
      levels.push({ level: 3, label: "Level 3", groups });
    }
    if (d.level_4 > 0) {
      levels.push({ level: 4, label: "Level 4", groups: [{ group_id: "G1", subgroup_count: 0 }] });
    }

    await db.collection("settings").updateOne(
      { _id: groupSettings._id },
      {
        $set: {
          type: "levels_config",
          data: { levels },
          updated_at: new Date(),
        }
      }
    );
    console.log("  ✅ groups settings migrated to levels_config");
  } else {
    console.log("  ℹ️  No groups settings found — skipping");
  }

  // ── 4. Migrate schedule entries ─────────────────────────────────────────────
  console.log("Migrating schedule entries...");
  const schedules = await db.collection("schedules").find({}).toArray();
  for (const sched of schedules) {
    const newEntries = (sched.entries ?? []).map(e => ({
      ...e,
      room_code:      "",
      session_type:   "lecture",
      level:          0,
      subgroup:       null,
      groups_covered: [],
      course_code:    "",
      course_name:    "",
    }));
    await db.collection("schedules").updateOne(
      { _id: sched._id },
      { $set: { entries: newEntries } }
    );
  }
  console.log(`  ✅ ${schedules.length} schedules migrated`);

  // ── 5. Drop rooms collection ─────────────────────────────────────────────────
  console.log("Dropping rooms collection...");
  try {
    await db.collection("rooms").drop();
    console.log("  ✅ rooms collection dropped");
  } catch {
    console.log("  ℹ️  rooms collection already gone");
  }

  console.log("\n🎉 Migration complete.");
}

main().catch(err => { console.error(err); process.exit(1); }).finally(() => client.close());
