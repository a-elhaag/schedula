import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

// ── POST /api/coordinator/import/validate ─────────────────────────────────────
export async function POST(request) {
  try {
    getCurrentUser(request, { requiredRole: "coordinator" });

    const formData = await request.formData();
    const file     = formData.get("file");
    const type     = formData.get("type") ?? "courses";

    if (!file) {
      return NextResponse.json({ message: "No file provided." }, { status: 400 });
    }

    const text    = await file.text();
    const lines   = text.trim().split("\n").filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json({ valid: 0, errors: ["File is empty or has no data rows."], warnings: [] });
    }

    const headers  = lines[0].split(",").map(h => h.trim().toLowerCase());
    const dataRows = lines.slice(1);
    const errors   = [];
    const warnings = [];

    // Required columns per type
    const required = {
      courses: ["code","name","credit_hours"],
      staff:   ["name","email","role"],
      rooms:   ["name","label","building"],
    }[type] ?? [];

    const missing = required.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      errors.push(`Missing required columns: ${missing.join(", ")}`);
    }

    let valid = 0;
    if (errors.length === 0) {
      dataRows.forEach((row, i) => {
        const vals = row.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj  = Object.fromEntries(headers.map((h, j) => [h, vals[j] ?? ""]));
        const rowNum = i + 2;

        if (type === "courses") {
          if (!obj.code)          errors.push(`Row ${rowNum}: missing code`);
          else if (!obj.name)     errors.push(`Row ${rowNum}: missing name`);
          else                    valid++;
        } else if (type === "staff") {
          const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email ?? "");
          if (!obj.name)          errors.push(`Row ${rowNum}: missing name`);
          else if (!emailOk)      errors.push(`Row ${rowNum}: invalid email "${obj.email}"`);
          else if (!["professor","ta"].includes(obj.role?.toLowerCase())) {
            warnings.push(`Row ${rowNum}: role "${obj.role}" defaulting to professor`);
            valid++;
          } else                  valid++;
        } else if (type === "rooms") {
          if (!obj.label)         errors.push(`Row ${rowNum}: missing label`);
          else if (!obj.name)     errors.push(`Row ${rowNum}: missing name`);
          else                    valid++;
        }
      });
    }

    return NextResponse.json({ valid, errors: errors.slice(0, 20), warnings: warnings.slice(0, 10), total: dataRows.length });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}