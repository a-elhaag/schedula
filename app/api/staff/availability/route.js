import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/server/auth";

const VALID_DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];

export async function GET(request) {
  try {
    const { userId } = getCurrentUser(request);
    const db = await getDb();

    const user = await db.collection("users").findOne({
      _id:  new ObjectId(userId),
      role: { $in: ["professor", "ta"] },
    });

    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const institution = await db.collection("institutions").findOne({ _id: user.institution_id });
    const termLabel   = institution?.active_term?.label ?? "Spring 2026";
    const workingDays = institution?.active_term?.working_days ?? VALID_DAYS;

    const existing = await db.collection("availability").findOne({
      user_id:    user._id,
      term_label: termLabel,
    });

    return NextResponse.json({
      staff:          { name: user.name, role: user.role, email: user.email },
      term:           termLabel,
      working_days:   workingDays,
      available_days: existing?.available_days ?? [],
      submitted:      !!existing,
    });

  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = getCurrentUser(request, { requiredRole: ["professor", "ta"] });
    const body = await request.json();
    const { available_days } = body;

    if (!Array.isArray(available_days)) {
      return NextResponse.json({ error: "available_days must be an array" }, { status: 400 });
    }

    const db   = await getDb();
    const user = await db.collection("users").findOne({
      _id:  new ObjectId(userId),
      role: { $in: ["professor", "ta"] },
    });

    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const institution = await db.collection("institutions").findOne({ _id: user.institution_id });
    const termLabel   = institution?.active_term?.label ?? "Spring 2026";
    const workingDays = institution?.active_term?.working_days ?? VALID_DAYS;

    const cleanDays = available_days.filter(d => workingDays.includes(d));

    await db.collection("availability").updateOne(
      { user_id: user._id, institution_id: user.institution_id, term_label: termLabel },
      {
        $set: {
          user_id:        user._id,
          institution_id: user.institution_id,
          term_label:     termLabel,
          available_days: cleanDays,
          submitted_at:   new Date(),
          updated_at:     new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, term: termLabel, available_days: cleanDays });

  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
