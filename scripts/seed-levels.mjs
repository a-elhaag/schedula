import { client, DB_NAME } from "./db/client.mjs";
import { ObjectId } from "mongodb";

const INSTITUTION_SLUG = "ecu-set";

const LEVELS_CONFIG = [
  {
    level: 0,
    label: "Freshman",
    groups: [
      { group_id: "GA", subgroup_count: 12 },
      { group_id: "GB", subgroup_count: 9 },
    ],
  },
  {
    level: 1,
    label: "Level 1",
    groups: [
      { group_id: "G1", subgroup_count: 3 },
      { group_id: "G2", subgroup_count: 3 },
      { group_id: "G3", subgroup_count: 3 },
    ],
  },
  {
    level: 2,
    label: "Level 2",
    groups: [
      { group_id: "G1", subgroup_count: 3 },
      { group_id: "G2", subgroup_count: 3 },
    ],
  },
  {
    level: 3,
    label: "Level 3",
    groups: [
      { group_id: "G1", subgroup_count: 3 },
      { group_id: "G2", subgroup_count: 2 },
    ],
  },
  {
    level: 4,
    label: "Level 4",
    groups: [
      { group_id: "G1", subgroup_count: 0 },
    ],
  },
];

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);

  const inst = await db.collection("institutions").findOne({ slug: INSTITUTION_SLUG });
  if (!inst) { console.error("Institution not found"); process.exit(1); }
  const iOid = inst._id;

  await db.collection("settings").updateOne(
    { institution_id: iOid, type: "levels_config" },
    {
      $set: {
        institution_id: iOid,
        type:           "levels_config",
        data:           { levels: LEVELS_CONFIG },
        updated_at:     new Date(),
      },
    },
    { upsert: true }
  );

  console.log("✅ Levels config upserted (Freshman + Levels 1–4)");
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
