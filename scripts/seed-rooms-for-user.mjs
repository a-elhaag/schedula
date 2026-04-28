/**
 * Seed rooms (and fix institution setup) for a specific user account.
 * Run: node --env-file=.env scripts/seed-rooms-for-user.mjs <email>
 *
 * If no email given, prints all coordinator accounts to choose from.
 */

import { client, DB_NAME } from "./db/client.mjs";
import { ObjectId } from "mongodb";

const TARGET_EMAIL = process.argv[2];

const ROOMS = [
  { label: "A101", name: "Room A101", building: "Building A", capacity: 40 },
  { label: "A102", name: "Room A102", building: "Building A", capacity: 40 },
  { label: "A201", name: "Room A201", building: "Building A", capacity: 35 },
  { label: "A202", name: "Room A202", building: "Building A", capacity: 35 },
  { label: "A207", name: "Room A207", building: "Building A", capacity: 40 },
  { label: "A301", name: "Room A301", building: "Building A", capacity: 30 },
  { label: "A302", name: "Room A302", building: "Building A", capacity: 30 },
  { label: "A307", name: "Room A307", building: "Building A", capacity: 35 },
  { label: "A308", name: "Room A308", building: "Building A", capacity: 35 },
  { label: "A312", name: "Room A312", building: "Building A", capacity: 30 },
  { label: "A313", name: "Room A313", building: "Building A", capacity: 30 },
  { label: "B101", name: "Lab B101",  building: "Building B", capacity: 25 },
  { label: "B102", name: "Lab B102",  building: "Building B", capacity: 25 },
  { label: "B201", name: "Lab B201",  building: "Building B", capacity: 20 },
  { label: "D101", name: "Room D101", building: "Building D", capacity: 50 },
  { label: "D106", name: "Room D106", building: "Building D", capacity: 45 },
  { label: "D107", name: "Room D107", building: "Building D", capacity: 45 },
  { label: "D109", name: "Room D109", building: "Building D", capacity: 40 },
];

const INSTITUTION_SETUP = {
  name: "Software Engineering Department",
  slug: "se-dept",
  active_term: {
    label: "Spring 2026",
    start_date: "2026-02-01",
    end_date: "2026-06-15",
    working_days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"],
  },
  settings: {
    slot_duration_minutes: 60,
    daily_start: "08:00",
    daily_end: "17:00",
    max_consecutive_slots: 4,
  },
  updated_at: new Date(),
};

async function run() {
  await client.connect();
  const db = client.db(DB_NAME);

  // List coordinators if no email given
  if (!TARGET_EMAIL) {
    const coordinators = await db.collection("users")
      .find({ role: "coordinator", deleted_at: null })
      .project({ email: 1, name: 1, institution_id: 1 })
      .toArray();

    if (!coordinators.length) {
      console.log("No coordinator accounts found.");
    } else {
      console.log("\nCoordinator accounts:");
      coordinators.forEach(u =>
        console.log(`  ${u.email}  (institution: ${u.institution_id})`)
      );
      console.log("\nRun: node --env-file=.env scripts/seed-rooms-for-user.mjs <email>\n");
    }
    await client.close();
    return;
  }

  // Find user
  const user = await db.collection("users").findOne({ email: TARGET_EMAIL });
  if (!user) {
    console.error(`User not found: ${TARGET_EMAIL}`);
    await client.close();
    process.exit(1);
  }
  console.log(`\nUser found: ${user.name} (${user.role})`);

  // Resolve institution
  let institutionId = user.institution_id;
  if (!institutionId) {
    // Create new institution for this user
    const inst = await db.collection("institutions").insertOne({
      ...INSTITUTION_SETUP,
      created_at: new Date(),
    });
    institutionId = inst.insertedId;
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { institution_id: institutionId } }
    );
    console.log(`Created institution: ${institutionId}`);
  } else {
    // Ensure institution has proper setup fields
    const inst = await db.collection("institutions").findOne({ _id: institutionId });
    if (!inst?.settings || !inst?.active_term) {
      await db.collection("institutions").updateOne(
        { _id: institutionId },
        { $set: INSTITUTION_SETUP }
      );
      console.log(`Updated institution setup: ${institutionId}`);
    } else {
      console.log(`Institution OK: ${institutionId}`);
    }
  }

  // Check existing rooms
  const existing = await db.collection("rooms")
    .find({ institution_id: institutionId, deleted_at: null })
    .toArray();

  console.log(`\nExisting rooms: ${existing.length}`);

  if (existing.length > 0) {
    console.log("Rooms already exist:");
    existing.forEach(r => console.log(`  ${r.label} - ${r.name} (cap: ${r.capacity})`));
    console.log("\nSkipping room insertion. Delete rooms first if you want to re-seed.");
    await client.close();
    return;
  }

  // Insert rooms
  const roomDocs = ROOMS.map(r => ({
    institution_id: institutionId,
    name: r.name,
    label: r.label,
    building: r.building,
    capacity: r.capacity,
    created_at: new Date(),
    deleted_at: null,
  }));

  const result = await db.collection("rooms").insertMany(roomDocs);
  console.log(`\nInserted ${Object.keys(result.insertedIds).length} rooms:`);
  ROOMS.forEach(r => console.log(`  ${r.label} - ${r.building} (cap: ${r.capacity})`));
  console.log(`\nInstitution ID: ${institutionId}`);
  console.log("Done.\n");

  await client.close();
}

run().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
