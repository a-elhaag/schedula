import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export async function resolveInstitutionId(institutionId) {
  if (!institutionId || !ObjectId.isValid(institutionId)) {
    const db   = await getDb();
    const inst = await db.collection("institutions").findOne(
      {}, { projection: { _id: 1 }, sort: { created_at: 1 } }
    );
    if (!inst) throw Object.assign(new Error("No institution found."), { status: 404 });
    return inst._id;
  }
  return new ObjectId(institutionId);
}