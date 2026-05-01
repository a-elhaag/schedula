/**
 * scripts/setup-db.mjs
 *
 * Deploys the Schedula data model to MongoDB Atlas.
 * Run via: node --env-file=.env scripts/setup-db.mjs
 *
 * Creates all 11 collections with JSON Schema validators + indexes.
 * Safe to re-run — skips existing collections, upserts indexes.
 */

import { MongoClient, ServerApiVersion } from "mongodb";

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

// ─── Schema Validators ────────────────────────────────────────────────────────

const validators = {
  institutions: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "slug", "active_term", "settings", "created_at"],
      properties: {
        name: { bsonType: "string" },
        slug: { bsonType: "string" },
        active_term: {
          bsonType: "object",
          required: ["label", "start_date", "end_date", "working_days"],
          properties: {
            label: { bsonType: "string" },
            start_date: { bsonType: "string" },
            end_date: { bsonType: "string" },
            working_days: { bsonType: "array", items: { bsonType: "string" } },
          },
        },
        settings: {
          bsonType: "object",
          required: [
            "slot_duration_minutes",
            "daily_start",
            "daily_end",
            "max_consecutive_slots",
          ],
          properties: {
            slot_duration_minutes: { bsonType: "int" },
            daily_start: { bsonType: "string" },
            daily_end: { bsonType: "string" },
            max_consecutive_slots: { bsonType: "int" },
          },
        },
        created_at: { bsonType: "date" },
        deleted_at: { bsonType: ["date", "null"] },
      },
    },
  },

  faculties: {
    $jsonSchema: {
      bsonType: "object",
      required: ["institution_id", "name", "created_at"],
      properties: {
        institution_id: { bsonType: "objectId" },
        name: { bsonType: "string" },
        created_at: { bsonType: "date" },
        deleted_at: { bsonType: ["date", "null"] },
      },
    },
  },

  departments: {
    $jsonSchema: {
      bsonType: "object",
      required: ["institution_id", "faculty_id", "name", "created_at"],
      properties: {
        institution_id: { bsonType: "objectId" },
        faculty_id: { bsonType: "objectId" },
        name: { bsonType: "string" },
        created_at: { bsonType: "date" },
        deleted_at: { bsonType: ["date", "null"] },
      },
    },
  },

  users: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "institution_id",
        "email",
        "password_hash",
        "role",
        "name",
        "invite_status",
        "created_at",
      ],
      properties: {
        institution_id: { bsonType: "objectId" },
        faculty_id: { bsonType: ["objectId", "null"] },
        department_id: { bsonType: ["objectId", "null"] },
        email: { bsonType: "string" },
        password_hash: { bsonType: ["string", "null"] },
        role: {
          bsonType: "string",
          enum: ["coordinator", "professor", "ta", "student"],
        },
        name: { bsonType: "string" },
        invite_status: { bsonType: "string", enum: ["pending", "joined"] },
        invited_by: { bsonType: ["objectId", "null"] },
        invite_token: { bsonType: ["string", "null"] },
        invite_expires_at: { bsonType: ["date", "null"] },
        email_verified_at: { bsonType: ["date", "null"] },
        email_verify_token: { bsonType: ["string", "null"] },
        email_verify_expires_at: { bsonType: ["date", "null"] },
        password_reset_token: { bsonType: ["string", "null"] },
        password_reset_expires_at: { bsonType: ["date", "null"] },
        refresh_token_hash: { bsonType: ["string", "null"] },
        created_at: { bsonType: "date" },
        deleted_at: { bsonType: ["date", "null"] },
      },
    },
  },

  rooms: {
    $jsonSchema: {
      bsonType: "object",
      required: ["institution_id", "name", "label", "created_at"],
      properties: {
        institution_id: { bsonType: "objectId" },
        name: { bsonType: "string" },
        label: { bsonType: "string" },
        building: { bsonType: ["string", "null"] },
        created_at: { bsonType: "date" },
        deleted_at: { bsonType: ["date", "null"] },
      },
    },
  },

  courses: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "institution_id",
        "faculty_id",
        "department_id",
        "code",
        "name",
        "credit_hours",
        "sections",
        "created_at",
      ],
      properties: {
        institution_id: { bsonType: "objectId" },
        faculty_id: { bsonType: "objectId" },
        department_id: { bsonType: "objectId" },
        code: { bsonType: "string" },
        name: { bsonType: "string" },
        credit_hours: { bsonType: "int" },
        sections: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: [
              "section_id",
              "type",
              "year_levels",
              "slots_per_week",
              "slot_duration_minutes",
              "capacity",
              "required_room_label",
              "assigned_staff",
            ],
            properties: {
              section_id: { bsonType: "string" },
              type: {
                bsonType: "string",
                enum: ["lecture", "lab", "tutorial"],
              },
              year_levels: { bsonType: "array", items: { bsonType: "int" } },
              slots_per_week: { bsonType: "int" },
              slot_duration_minutes: { bsonType: "int" },
              capacity: { bsonType: "int" },
              required_room_label: { bsonType: "string" },
              assigned_staff: {
                bsonType: "array",
                items: { bsonType: "objectId" },
              },
              shared_with: {
                bsonType: "array",
                items: { bsonType: "objectId" },
              },
            },
          },
        },
        created_at: { bsonType: "date" },
        deleted_at: { bsonType: ["date", "null"] },
      },
    },
  },

  availability: {
    $jsonSchema: {
      bsonType: "object",
      required: ["institution_id", "user_id", "term_label", "submitted_at"],
      properties: {
        institution_id: { bsonType: "objectId" },
        user_id: { bsonType: "objectId" },
        term_label: { bsonType: "string" },
        day_off: { bsonType: ["string", "null"] },
        preferred_break: {
          bsonType: "object",
          properties: {
            start: { bsonType: "string" },
            end: { bsonType: "string" },
          },
        },
        submitted_at: { bsonType: "date" },
        updated_at: { bsonType: ["date", "null"] },
      },
    },
  },

  constraints: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "institution_id",
        "type",
        "category",
        "created_by",
        "created_at",
      ],
      properties: {
        institution_id: { bsonType: "objectId" },
        term_label: { bsonType: ["string", "null"] },
        type: { bsonType: "string", enum: ["hard", "soft"] },
        category: {
          bsonType: "string",
          enum: [
            "no_room_double_booking",
            "staff_availability",
            "room_capacity",
            "room_label_match",
            "staff_day_off",
            "daily_hours",
            "working_days",
            "dept_level_conflict",
            "shared_lecture_conflict",
            "break_window",
            "max_consecutive_slots",
            "spread_sessions",
            "cluster_staff_days",
          ],
        },
        config: { bsonType: ["object", "null"] },
        weight: { bsonType: ["double", "int", "null"] },
        scope: {
          bsonType: "object",
          properties: {
            entity_type: { bsonType: ["string", "null"] },
            entity_id: { bsonType: ["objectId", "null"] },
          },
        },
        created_by: { bsonType: "objectId" },
        created_at: { bsonType: "date" },
        deleted_at: { bsonType: ["date", "null"] },
      },
    },
  },

  schedule_jobs: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "institution_id",
        "term_label",
        "status",
        "triggered_by",
        "triggered_at",
      ],
      properties: {
        institution_id: { bsonType: "objectId" },
        term_label: { bsonType: "string" },
        status: {
          bsonType: "string",
          enum: ["pending", "running", "completed", "failed"],
        },
        triggered_by: { bsonType: "objectId" },
        triggered_at: { bsonType: "date" },
        completed_at: { bsonType: ["date", "null"] },
        error: { bsonType: ["string", "null"] },
        solver_meta: {
          bsonType: ["object", "null"],
          properties: {
            duration_ms: { bsonType: "int" },
            objective_score: { bsonType: "double" },
            hard_violations: { bsonType: "int" },
          },
        },
        result_snapshot_id: { bsonType: ["objectId", "null"] },
      },
    },
  },

  schedule_snapshots: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "institution_id",
        "job_id",
        "term_label",
        "generated_at",
        "entries",
      ],
      properties: {
        institution_id: { bsonType: "objectId" },
        job_id: { bsonType: "objectId" },
        term_label: { bsonType: "string" },
        generated_at: { bsonType: "date" },
        entries: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: [
              "course_id",
              "section_id",
              "room_id",
              "staff_id",
              "day",
              "start",
              "end",
            ],
            properties: {
              course_id: { bsonType: "objectId" },
              section_id: { bsonType: "string" },
              room_id: { bsonType: "objectId" },
              staff_id: { bsonType: "objectId" },
              day: { bsonType: "string" },
              start: { bsonType: "string" },
              end: { bsonType: "string" },
            },
          },
        },
        warnings: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              type: { bsonType: "string" },
              constraint_id: { bsonType: "objectId" },
              message: { bsonType: "string" },
            },
          },
        },
      },
    },
  },

  schedules: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "institution_id",
        "term_label",
        "approved_by",
        "approved_at",
        "snapshot_id",
        "entries",
        "is_published",
        "created_at",
      ],
      properties: {
        institution_id: { bsonType: "objectId" },
        term_label: { bsonType: "string" },
        approved_by: { bsonType: "objectId" },
        approved_at: { bsonType: "date" },
        snapshot_id: { bsonType: "objectId" },
        entries: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: [
              "course_id",
              "section_id",
              "room_id",
              "staff_id",
              "day",
              "start",
              "end",
            ],
            properties: {
              course_id: { bsonType: "objectId" },
              section_id: { bsonType: "string" },
              room_id: { bsonType: "objectId" },
              staff_id: { bsonType: "objectId" },
              day: { bsonType: "string" },
              start: { bsonType: "string" },
              end: { bsonType: "string" },
            },
          },
        },
        is_published: { bsonType: "bool" },
        published_at: { bsonType: ["date", "null"] },
        created_at: { bsonType: "date" },
      },
    },
  },
};

// ─── Index Definitions ────────────────────────────────────────────────────────

const indexes = {
  institutions: [
    { key: { slug: 1 }, options: { unique: true, name: "slug_unique" } },
    { key: { deleted_at: 1 }, options: { name: "deleted_at" } },
  ],

  faculties: [
    { key: { institution_id: 1 }, options: { name: "institution_id" } },
    { key: { deleted_at: 1 }, options: { name: "deleted_at" } },
  ],

  departments: [
    {
      key: { institution_id: 1, faculty_id: 1 },
      options: { name: "institution_faculty" },
    },
    { key: { deleted_at: 1 }, options: { name: "deleted_at" } },
  ],

  users: [
    { key: { email: 1 }, options: { unique: true, name: "email_unique" } },
    {
      key: { institution_id: 1, role: 1 },
      options: { name: "institution_role" },
    },
    { key: { deleted_at: 1 }, options: { name: "deleted_at" } },
  ],

  rooms: [
    {
      key: { institution_id: 1, label: 1 },
      options: { name: "institution_label" },
    },
    { key: { deleted_at: 1 }, options: { name: "deleted_at" } },
  ],

  courses: [
    {
      key: { institution_id: 1, code: 1 },
      options: { unique: true, name: "institution_code_unique" },
    },
    { key: { department_id: 1 }, options: { name: "department_id" } },
    { key: { deleted_at: 1 }, options: { name: "deleted_at" } },
  ],

  availability: [
    {
      key: { user_id: 1, term_label: 1 },
      options: { unique: true, name: "user_term_unique" },
    },
    {
      key: { institution_id: 1, term_label: 1 },
      options: { name: "institution_term" },
    },
  ],

  constraints: [
    {
      key: { institution_id: 1, term_label: 1, type: 1 },
      options: { name: "institution_term_type" },
    },
    { key: { deleted_at: 1 }, options: { name: "deleted_at" } },
  ],

  schedule_jobs: [
    {
      key: { institution_id: 1, status: 1 },
      options: { name: "institution_status" },
    },
    {
      key: { institution_id: 1, term_label: 1 },
      options: { name: "institution_term" },
    },
  ],

  schedule_snapshots: [
    {
      key: { institution_id: 1, job_id: 1 },
      options: { name: "institution_job" },
    },
    // TTL — auto-delete snapshots 7 days after generation
    {
      key: { generated_at: 1 },
      options: { expireAfterSeconds: 604800, name: "ttl_7d" },
    },
  ],

  schedules: [
    {
      // One schedule document per level per term (5 docs for 5 levels)
      key: { institution_id: 1, term_label: 1, level: 1 },
      options: { unique: true, sparse: true, name: "institution_term_level_unique" },
    },
    {
      key: { institution_id: 1, is_published: 1 },
      options: { name: "institution_published" },
    },
    { key: { "entries.staff_id": 1 }, options: { name: "entries_staff_id" } },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createCollectionSafe(db, name, validator) {
  try {
    await db.createCollection(name, {
      validator,
      validationLevel: "moderate", // existing docs skip validation
      validationAction: "warn", // log violations but do not reject writes
    });
    return "created";
  } catch (err) {
    if (err.codeName === "NamespaceExists" || err.code === 48) {
      return "exists";
    }
    throw err;
  }
}

function pad(str, len) {
  return str.padEnd(len, " ");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔌  Connecting to MongoDB Atlas…");
  await client.connect();

  // Verify connectivity
  await client.db("admin").command({ ping: 1 });
  console.log("✅  Connected.\n");

  const db = client.db(DB_NAME);
  console.log(`📦  Database: ${DB_NAME}\n`);

  const collectionNames = Object.keys(validators);
  const results = [];

  for (const name of collectionNames) {
    const status = await createCollectionSafe(db, name, {
      $jsonSchema: validators[name].$jsonSchema,
    });
    const col = db.collection(name);

    let indexCount = 0;
    for (const { key, options } of indexes[name]) {
      await col.createIndex(key, options);
      indexCount++;
    }

    results.push({ name, status, indexCount });
    const tag = status === "created" ? "✚ created" : "○ exists ";
    console.log(
      `  ${tag}  ${pad(name, 22)}  (${indexCount} index${indexCount !== 1 ? "es" : ""})`,
    );
  }

  console.log("\n─────────────────────────────────────────");
  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "exists").length;
  const totalIndexes = results.reduce((s, r) => s + r.indexCount, 0);
  console.log(`  ${created} collection(s) created, ${skipped} already existed`);
  console.log(`  ${totalIndexes} index(es) ensured (upserted)`);
  console.log("─────────────────────────────────────────\n");
  console.log("🎉  Schedula data model deployed successfully.\n");
}

main()
  .catch((err) => {
    console.error("\n❌  Setup failed:", err.message, "\n");
    process.exit(1);
  })
  .finally(() => client.close());
