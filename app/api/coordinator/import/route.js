import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── GET /api/coordinator/import  (dashboard stats) ───────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const db   = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    const [coursesCount, staffCount, roomsCount] = await Promise.all([
      db.collection("courses").countDocuments({ institution_id: iOid, deleted_at: null }),
      db.collection("users").countDocuments({   institution_id: iOid, deleted_at: null, role: { $in: ["professor","ta"] } }),
      db.collection("rooms").countDocuments({   institution_id: iOid, deleted_at: null }),
    ]);

    return NextResponse.json({ coursesCount, staffCount, roomsCount, recentImports: [] });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/import  (write to DB) ───────────────────────────────
export async function POST(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const formData = await request.formData();
    const file     = formData.get("file");
    const type     = formData.get("type") ?? "courses";

    if (!file) {
      return NextResponse.json({ message: "No file provided." }, { status: 400 });
    }

    const text    = await file.text();
    const lines   = text.trim().split("\n").filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const rows    = lines.slice(1);

    const db   = await getDb();
    const iOid = new ObjectId(institutionId);
    let imported = 0;

    if (type === "courses") {
      const docs = rows.map(row => {
        const vals = row.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj  = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
        return {
          institution_id: iOid,
          code:           obj.code?.toUpperCase() ?? "",
          name:           obj.name ?? "",
          credit_hours:   parseInt(obj.credit_hours) || 3,
          sections:       [],
          created_at:     new Date(),
          deleted_at:     null,
        };
      }).filter(d => d.code && d.name);

      if (docs.length > 0) {
        const ops = docs.map(d => ({
          updateOne: {
            filter: { institution_id: iOid, code: d.code },
            update: { $setOnInsert: d },
            upsert: true,
          },
        }));
        const result = await db.collection("courses").bulkWrite(ops);
        imported = result.upsertedCount + result.modifiedCount;
      }

    } else if (type === "staff") {
      const docs = rows.map(row => {
        const vals = row.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj  = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
        return {
          institution_id: iOid,
          name:           obj.name ?? "",
          email:          obj.email?.toLowerCase() ?? "",
          role:           ["professor","ta"].includes(obj.role?.toLowerCase()) ? obj.role.toLowerCase() : "professor",
          password_hash:  "",
          invite_status:  "pending",
          created_at:     new Date(),
          deleted_at:     null,
        };
      }).filter(d => d.name && d.email);

      if (docs.length > 0) {
        const ops = docs.map(d => ({
          updateOne: {
            filter: { email: d.email },
            update: { $setOnInsert: d },
            upsert: true,
          },
        }));
        const result = await db.collection("users").bulkWrite(ops);
        imported = result.upsertedCount;
      }

    } else if (type === "rooms") {
      const docs = rows.map(row => {
        const vals = row.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj  = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
        return {
          institution_id: iOid,
          name:           obj.name ?? "",
          label:          obj.label ?? "",
          building:       obj.building ?? "",
          capacity:       parseInt(obj.capacity) || 30,
          created_at:     new Date(),
          deleted_at:     null,
        };
      }).filter(d => d.name && d.label);

      if (docs.length > 0) {
        const ops = docs.map(d => ({
          updateOne: {
            filter: { institution_id: iOid, label: d.label },
            update: { $setOnInsert: d },
            upsert: true,
          },
        }));
        const result = await db.collection("rooms").bulkWrite(ops);
        imported = result.upsertedCount;
      }
    }

    return NextResponse.json({ ok: true, imported, type });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}