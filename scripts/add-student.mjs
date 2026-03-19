/**
 * scripts/add-student.mjs
 * Adds a test student user to the real database.
 * Run via: node --env-file=.env scripts/add-student.mjs
 */

import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const DB  = process.env.MONGODB_DB ?? "schedula";

if (!uri) { console.error("❌  MONGODB_URI missing"); process.exit(1); }

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function main() {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("✅  Connected\n");

  const db = client.db(DB);

  // Use the real IDs from your database
  const INSTITUTION_ID = new ObjectId("69b538e5aa373449d761b122");
  const FACULTY_ID     = new ObjectId("69b538e5aa373449d761b123");
  const DEPARTMENT_ID  = new ObjectId("69b538e5aa373449d761b124");

  const student = {
    _id:            new ObjectId(),
    institution_id: INSTITUTION_ID,
    faculty_id:     FACULTY_ID,
    department_id:  DEPARTMENT_ID,
    email:          "farida.hassan@university.edu",
    password_hash:  "hashed_password_placeholder",
    role:           "student",
    name:           "Farida Hassan",
    student_id:     "202201234",
    major:          "Software Engineering",
    year_level:     1,           // Change to 2, 3, or 4 to filter by year
    invite_status:  "joined",
    refresh_token_hash: null,
    created_at:     new Date(),
    deleted_at:     null,
  };

  await db.collection("users").insertOne(student);

  console.log("🎉  Student added successfully!\n");
  console.log("─────────────────────────────────────────");
  console.log(`Name:       ${student.name}`);
  console.log(`Student ID: ${student.student_id}`);
  console.log(`Year Level: ${student.year_level}`);
  console.log(`Role:       ${student.role}`);
  console.log(`\n👉  Copy this ID into page.js:`);
  console.log(`\nconst CURRENT_USER_ID = "${student._id.toString()}";\n`);
  console.log("─────────────────────────────────────────");
}

main()
  .catch(err => { console.error("❌  Failed:", err.message); process.exit(1); })
  .finally(() => client.close());
