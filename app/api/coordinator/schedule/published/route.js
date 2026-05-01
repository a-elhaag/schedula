import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

// ── GET /api/coordinator/schedule/published ───────────────────────────────────
export async function GET(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();

    const [publishedSchedules, institution] = await Promise.all([
      db.collection("schedules").find({ institution_id: iOid, is_published: true })
        .sort({ level: 1 }).toArray(),
      db.collection("institutions").findOne({ _id: iOid }),
    ]);

    if (!publishedSchedules.length) {
      return NextResponse.json({ scheduleId: null, levels: [], stats: {} });
    }

    const entries  = publishedSchedules.flatMap(s => s.entries ?? []);
    const staffIds = [...new Set(entries.map(e => e.staff_id?.toString()).filter(Boolean))];

    const staff = staffIds.length
      ? await db.collection("users").find({ _id: { $in: staffIds.map(id => new ObjectId(id)) } }).toArray()
      : [];

    const courseIds = [...new Set(entries.map(e => e.course_id?.toString()).filter(Boolean))];
    const courses   = courseIds.length
      ? await db.collection("courses").find({ _id: { $in: courseIds.map(id => new ObjectId(id)) } }).toArray()
      : [];

    const courseMap = Object.fromEntries(courses.map(c => [c._id.toString(), c]));
    const staffMap  = Object.fromEntries(staff.map(s  => [s._id.toString(), s]));
    const schedule  = publishedSchedules[0];

    const enriched = entries.map((e, i) => {
      const course  = courseMap[e.course_id?.toString()];
      const room    = e.room_code ?? "--";
      const member  = staffMap[e.staff_id?.toString()];
      return {
        id:             `${i}`,
        day:            e.day,
        period:         e.period ?? null,
        start:          e.start,
        end:            e.end,
        course_code:    e.course_code ?? course?.code     ?? "--",
        course_name:    e.course_name ?? course?.name     ?? "--",
        session_type:   e.session_type ?? "lecture",
        room_code:      e.room_code ?? room,
        instructor:     member?.name ?? "TBA",
        staff_id:       e.staff_id?.toString() ?? null,
        subgroup:       e.subgroup       ?? null,
        groups_covered: e.groups_covered ?? [],
        level:          e.level          ?? 0,
      };
    });

    // Load levels_config to know level labels and column order
    const levelsConfig = await db.collection("settings").findOne({ institution_id: iOid, type: "levels_config" });
    const levelsList   = levelsConfig?.data?.levels ?? [];

    // Group entries by level
    const entriesByLevel = {};
    for (const entry of enriched) {
      const lvNum = entry.level ?? 0;
      if (!entriesByLevel[lvNum]) entriesByLevel[lvNum] = [];
      entriesByLevel[lvNum].push(entry);
    }

    // Build per-level data with columns derived from entries
    const levels = levelsList.map(lv => {
      const lvEntries = entriesByLevel[lv.level] ?? [];
      const colSet = new Set();
      for (const e of lvEntries) {
        if (e.subgroup) {
          colSet.add(e.subgroup);
        } else {
          for (const g of (e.groups_covered ?? [])) colSet.add(g);
        }
      }
      const columns = [...colSet].sort();
      return { level: lv.level, label: lv.label, columns, entries: lvEntries };
    });

    return NextResponse.json({
      scheduleId:  schedule._id.toString(),
      termLabel:   schedule.term_label,
      isPublished: true,
      publishedAt: schedule.published_at ?? null,
      levels,
      stats: {
        courses: new Set(enriched.map(s => s.course_code)).size,
        staff:   new Set(enriched.map(s => s.staff_id?.toString())).size,
        rooms:   new Set(enriched.map(s => s.room_code)).size,
      },
      institution: {
        working_days: institution?.active_term?.working_days ?? [],
        num_periods:  institution?.settings?.num_periods ?? 10,
        daily_start:  institution?.settings?.daily_start ?? "08:30",
      },
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/schedule/published  (action: unpublish) ─────────────
export async function POST(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();
    const body   = await request.json();

    if (body.action !== "unpublish") {
      return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    }

    // Unpublish all level schedules for this institution
    await db.collection("schedules").updateMany(
      { institution_id: iOid, is_published: true },
      { $set: { is_published: false, unpublished_at: new Date() } }
    );

    return NextResponse.json({ ok: true, message: "Schedule unpublished." });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
