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
    let rows = [];
    let headers = [];

    const headerAliases = {
      "course code": "code", "course_code": "code",
      "course name": "name", "course_name": "name",
      "credits": "credit_hours", "credit hours": "credit_hours",
      "year level": "year_levels", "year_level": "year_levels",
      "num sections": "num_sections", "num_sections": "num_sections",
      "lecture duration": "lecture_duration",
      "lab duration": "lab_duration",
      "tutorial duration": "tutorial_duration",
      "room label": "label", "room code": "label",
      "seats": "capacity",
      "term": "term_label",
      "enrolled": "enrolled_students", "students": "enrolled_students",
      "course_id": "course_id"
    };

    // Detect JSON vs CSV
    if (file.name.endsWith(".json")) {
      const jsonData = JSON.parse(text);
      if (!Array.isArray(jsonData)) {
        return NextResponse.json({ message: "JSON file must contain an array of objects." }, { status: 400 });
      }
      rows = jsonData;
      headers = jsonData.length > 0 ? Object.keys(jsonData[0]).map(h => h.toLowerCase()) : [];
    } else {
      const lines   = text.trim().split("\n").filter(Boolean);
      const rawHeaders = lines[0].split(",").map(h => h.trim().toLowerCase());
      const dataRows = lines.slice(1);
      headers = rawHeaders.map(h => headerAliases[h] || h);
      rows = dataRows;
    }

    const db   = await getDb();
    const iOid = new ObjectId(institutionId);
    let imported = 0;

    function buildSectionTypes(obj) {
      const types = [];
      if (obj.has_lecture === "true" || obj.lecture_duration) {
        types.push({ type: "lecture", duration_minutes: parseInt(obj.lecture_duration) || 90 });
      }
      if (obj.has_lab === "true" || obj.lab_duration) {
        types.push({ type: "lab", duration_minutes: parseInt(obj.lab_duration) || 120 });
      }
      if (obj.has_tutorial === "true" || obj.tutorial_duration) {
        types.push({ type: "tutorial", duration_minutes: parseInt(obj.tutorial_duration) || 60 });
      }
      return types.length > 0 ? types : [{ type: "lecture", duration_minutes: 90 }];
    }

    function parseYearLevels(val) {
      if (Array.isArray(val)) return val.filter(y => [1, 2, 3, 4].includes(Number(y))).map(Number);
      if (typeof val === "string") {
        return val.split("|").map(v => parseInt(v)).filter(y => [1, 2, 3, 4].includes(y));
      }
      return [1];
    }

    if (type === "courses") {
      const docs = rows.map(row => {
        let obj;
        if (file.name.endsWith(".json")) {
          obj = row;
        } else {
          const vals = row.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
          obj = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
        }

        const sectionTypes = buildSectionTypes(obj);
        const yearLevels = parseYearLevels(obj.year_levels || [1]);

        return {
          institution_id: iOid,
          code:           obj.code?.toUpperCase() ?? "",
          name:           obj.name ?? "",
          credit_hours:   parseInt(obj.credit_hours) || 3,
          num_sections:   parseInt(obj.num_sections || obj.sections) || 1,
          year_levels:    yearLevels,
          section_types:  sectionTypes,
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

    } else if (type === "enrollments") {
      // Import enrollments: course_code (or course_id), term_label, enrolled_students, capacity
      const courseCollection = db.collection("courses");
      const enrollmentCollection = db.collection("enrollments");
      
      const enrollmentDocs = [];
      
      for (const row of rows) {
        const vals = row.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
        
        const termLabel = obj.term_label ?? "";
        const enrolledStudents = parseInt(obj.enrolled_students) || 0;
        const capacity = parseInt(obj.capacity) || 0;
        
        if (!termLabel || capacity <= 0) continue;
        
        // Try to find course by code or ID
        let courseId = null;
        
        if (ObjectId.isValid(obj.course_id ?? "")) {
          courseId = new ObjectId(obj.course_id);
        } else if (obj.course_code || obj.code) {
          const cCode = obj.course_code || obj.code;
          const course = await courseCollection.findOne({
            institution_id: iOid,
            code: cCode.toUpperCase(),
            deleted_at: null,
          });
          if (course) {
            courseId = course._id;
          }
        }
        
        if (!courseId) continue;
        
        enrollmentDocs.push({
          institution_id: iOid,
          term_label: termLabel,
          course_id: courseId,
          enrolled_students: enrolledStudents,
          capacity: capacity,
          updated_at: new Date(),
          deleted_at: null,
        });
      }
      
      if (enrollmentDocs.length > 0) {
        const ops = enrollmentDocs.map(d => ({
          updateOne: {
            filter: {
              institution_id: iOid,
              term_label: d.term_label,
              course_id: d.course_id,
            },
            update: {
              $set: {
                enrolled_students: d.enrolled_students,
                capacity: d.capacity,
                updated_at: new Date(),
              },
              $setOnInsert: {
                institution_id: iOid,
                term_label: d.term_label,
                course_id: d.course_id,
                created_at: new Date(),
              },
            },
            upsert: true,
          },
        }));
        const result = await enrollmentCollection.bulkWrite(ops);
        imported = result.upsertedCount + result.modifiedCount;
      }
    }

    return NextResponse.json({ ok: true, imported, type });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}