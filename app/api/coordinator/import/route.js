import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import Papa from "papaparse";

export const POST = withApiErrorHandling(async function importCSV(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const formData = await request.formData();
    const file = formData.get("csvFile");
    
    if (!file) throw new Error("No CSV file provided");

    const buffer = Buffer.from(await file.arrayBuffer());
    const csvText = buffer.toString("utf-8");
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      return jsonError("CSV parsing errors: " + JSON.stringify(parsed.errors), 400);
    }

    const db = await getDb();
    const datasetType = formData.get("datasetType"); // "courses", "staff", "rooms", etc.

    let results = { inserted: 0, errors: [], warnings: 0 };

    for (const row of parsed.data) {
      try {
        // Schema validation & insert based on type (simplified example for courses)
        if (datasetType === "courses") {
          const course = {
            institution_id: new ObjectId(user.institutionId),
            code: row.code?.trim(),
            name: row.name?.trim(),
            credit_hours: parseInt(row.credit_hours) || 3,
            sections: parseInt(row.sections) || 1,
            created_at: new Date(),
            deleted_at: null
          };

          if (!course.code || !course.name) {
            results.warnings++;
            continue;
          }

          await db.collection("courses").insertOne(course);
          results.inserted++;
        }
        // Add cases for staff, rooms, etc.
      } catch (rowError) {
        results.errors.push({ row: row, error: rowError.message });
      }
    }

    return jsonOk({ 
      success: true, 
      stats: results,
      rowCount: parsed.data.length 
    });
  } catch (error) {
    return jsonError(error.message, 400);
  }
});

