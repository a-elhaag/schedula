import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGO_URI);

const VALID_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const VALID_SLOTS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

// Define availability patterns for different staff roles
const PROFESSOR_PATTERN = [
  // Morning sessions (8-11am)
  { day: "Saturday", slot: "08:00" },
  { day: "Saturday", slot: "09:00" },
  { day: "Saturday", slot: "10:00" },
  { day: "Sunday", slot: "08:00" },
  { day: "Sunday", slot: "09:00" },
  { day: "Sunday", slot: "10:00" },
  { day: "Monday", slot: "08:00" },
  { day: "Monday", slot: "09:00" },
  { day: "Monday", slot: "10:00" },
  { day: "Tuesday", slot: "08:00" },
  { day: "Tuesday", slot: "09:00" },
  { day: "Tuesday", slot: "10:00" },
  { day: "Wednesday", slot: "08:00" },
  { day: "Wednesday", slot: "09:00" },
  { day: "Wednesday", slot: "10:00" },
  { day: "Thursday", slot: "08:00" },
  { day: "Thursday", slot: "09:00" },
  { day: "Thursday", slot: "10:00" },
  // Afternoon sessions (1-5pm)
  { day: "Saturday", slot: "13:00" },
  { day: "Saturday", slot: "14:00" },
  { day: "Sunday", slot: "13:00" },
  { day: "Sunday", slot: "14:00" },
  { day: "Monday", slot: "13:00" },
  { day: "Monday", slot: "14:00" },
  { day: "Tuesday", slot: "13:00" },
  { day: "Tuesday", slot: "14:00" },
  { day: "Wednesday", slot: "13:00" },
  { day: "Wednesday", slot: "14:00" },
  { day: "Thursday", slot: "13:00" },
  { day: "Thursday", slot: "14:00" },
];

const TA_PATTERN = [
  // Flexible availability - mostly afternoons and some mornings
  { day: "Saturday", slot: "09:00" },
  { day: "Saturday", slot: "10:00" },
  { day: "Saturday", slot: "14:00" },
  { day: "Saturday", slot: "15:00" },
  { day: "Saturday", slot: "16:00" },
  { day: "Sunday", slot: "09:00" },
  { day: "Sunday", slot: "10:00" },
  { day: "Sunday", slot: "14:00" },
  { day: "Sunday", slot: "15:00" },
  { day: "Sunday", slot: "16:00" },
  { day: "Monday", slot: "09:00" },
  { day: "Monday", slot: "10:00" },
  { day: "Monday", slot: "14:00" },
  { day: "Monday", slot: "15:00" },
  { day: "Monday", slot: "16:00" },
  { day: "Tuesday", slot: "09:00" },
  { day: "Tuesday", slot: "10:00" },
  { day: "Tuesday", slot: "14:00" },
  { day: "Tuesday", slot: "15:00" },
  { day: "Tuesday", slot: "16:00" },
  { day: "Wednesday", slot: "09:00" },
  { day: "Wednesday", slot: "10:00" },
  { day: "Wednesday", slot: "14:00" },
  { day: "Wednesday", slot: "15:00" },
  { day: "Wednesday", slot: "16:00" },
  { day: "Thursday", slot: "09:00" },
  { day: "Thursday", slot: "10:00" },
  { day: "Thursday", slot: "14:00" },
  { day: "Thursday", slot: "15:00" },
  { day: "Thursday", slot: "16:00" },
];

async function addStaffAvailability() {
  try {
    await client.connect();
    const db = client.db("schedula");

    // Get all institutions
    const institutions = await db.collection("institutions").find({}).toArray();
    console.log(`Found ${institutions.length} institution(s)`);

    for (const institution of institutions) {
      const termLabel = institution.active_term?.label || "Spring 2026";
      console.log(`\nProcessing institution: ${institution.name} (${institution._id})`);
      console.log(`Active term: ${termLabel}`);

      // Get all staff for this institution
      const staff = await db.collection("users").find({
        institution_id: institution._id,
        role: { $in: ["professor", "ta"] },
        deleted_at: null,
      }).toArray();

      console.log(`  Found ${staff.length} staff members`);

      let added = 0;
      for (const member of staff) {
        // Choose pattern based on role
        const pattern = member.role === "professor" ? PROFESSOR_PATTERN : TA_PATTERN;

        // Check if availability already exists
        const existing = await db.collection("availability").findOne({
          user_id: member._id,
          institution_id: institution._id,
          term_label: termLabel,
        });

        if (!existing) {
          // Insert new availability
          await db.collection("availability").updateOne(
            {
              user_id: member._id,
              institution_id: institution._id,
              term_label: termLabel,
            },
            {
              $set: {
                user_id: member._id,
                institution_id: institution._id,
                term_label: termLabel,
                slots: pattern,
                submitted_at: new Date(),
                updated_at: new Date(),
              },
            },
            { upsert: true }
          );
          added++;
          console.log(`    ✓ Added availability for ${member.name} (${member.role})`);
        } else {
          console.log(`    - Availability already exists for ${member.name}`);
        }
      }

      console.log(`  Total added for this institution: ${added}`);
    }

    console.log("\n✓ Staff availability submitted successfully!");

  } catch (err) {
    console.error("Error adding staff availability:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

addStaffAvailability();
