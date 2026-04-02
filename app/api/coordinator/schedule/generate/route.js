import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

// ── GET /api/coordinator/schedule/generate ────────────────────────────────────
// Returns readiness stats + recent jobs. Also polls job status if jobId given.
export async function GET(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    // If polling a specific job
    if (jobId && ObjectId.isValid(jobId)) {
      const job = await db.collection("schedule_jobs").findOne({ _id: new ObjectId(jobId) });
      if (!job) return NextResponse.json({ status: "not_found" });
      return NextResponse.json({
        status:        job.status,
        statusMessage: job.status_message ?? "Processing...",
        error:         job.error ?? null,
        schedule:      job.schedule_id ? { id: job.schedule_id.toString() } : null,
      });
    }

    // Get counts for readiness check
    const [coursesCount, staffCount, roomsCount, availCount, constraintDoc, recentJobs] = await Promise.all([
      db.collection("courses").countDocuments({     institution_id: iOid, deleted_at: null }),
      db.collection("users").countDocuments({       institution_id: iOid, deleted_at: null, role: { $in: ["professor","ta"] } }),
      db.collection("rooms").countDocuments({       institution_id: iOid, deleted_at: null }),
      db.collection("availability").countDocuments({ institution_id: iOid }),
      db.collection("constraints").findOne({         institution_id: iOid }),
      db.collection("schedule_jobs").find({          institution_id: iOid }).sort({ created_at:-1 }).limit(5).toArray(),
    ]);

    return NextResponse.json({
      stats: { courses: coursesCount, staff: staffCount, rooms: roomsCount },
      readiness: {
        courses:      coursesCount > 0,
        staff:        staffCount   > 0,
        rooms:        roomsCount   > 0,
        availability: availCount   > 0,
        constraints:  !!constraintDoc,
      },
      recentJobs: recentJobs.map(j => ({
        id:             j._id.toString(),
        status:         j.status,
        term_label:     j.term_label,
        sessions_count: j.sessions_count ?? 0,
        created_at:     j.created_at,
      })),
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/schedule/generate ───────────────────────────────────
// Creates a schedule job and attempts to generate using available data.
// If FastAPI solver is ready, it calls it. Otherwise generates a basic schedule.
export async function POST(request) {
  try {
    const user   = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid   = await resolveInstitutionId(user.institutionId);
    const db     = await getDb();

    const institution = await db.collection("institutions").findOne({ _id: iOid });
    const termLabel   = institution?.active_term?.label ?? "Spring 2026";

    // Create job record
    const job = {
      institution_id: iOid,
      term_label:     termLabel,
      status:         "running",
      status_message: "Initializing...",
      created_at:     new Date(),
      created_by:     ObjectId.isValid(user.userId) ? new ObjectId(user.userId) : null,
    };
    const jobResult = await db.collection("schedule_jobs").insertOne(job);
    const jobId     = jobResult.insertedId;

    // Try FastAPI solver if configured
    const fastApiUrl = process.env.FASTAPI_URL;
    if (fastApiUrl) {
      try {
        const solverRes = await fetch(`${fastApiUrl}/solve`, {
          method:  "POST",
          headers: { "Content-Type":"application/json" },
          body:    JSON.stringify({ institution_id: iOid.toString(), term_label: termLabel }),
          signal:  AbortSignal.timeout(30000),
        });
        const solved = await solverRes.json();
        if (solverRes.ok && solved.entries) {
          const scheduleResult = await db.collection("schedules").insertOne({
            institution_id: iOid,
            term_label:     termLabel,
            entries:        solved.entries,
            is_published:   false,
            created_at:     new Date(),
          });
          await db.collection("schedule_jobs").updateOne(
            { _id: jobId },
            { $set: { status:"completed", sessions_count: solved.entries.length, schedule_id: scheduleResult.insertedId, status_message:"Done." } }
          );
          return NextResponse.json({ ok:true, jobId: jobId.toString(), schedule: { id: scheduleResult.insertedId.toString() } });
        }
      } catch (solverErr) {
        // FastAPI unavailable -- fall through to basic generation
      }
    }

    // Fallback: generate basic schedule from existing data
    const [courses, staff, rooms, availability] = await Promise.all([
      db.collection("courses").find({ institution_id: iOid, deleted_at: null }).toArray(),
      db.collection("users").find({   institution_id: iOid, deleted_at: null, role: { $in: ["professor","ta"] } }).toArray(),
      db.collection("rooms").find({   institution_id: iOid, deleted_at: null }).toArray(),
      db.collection("availability").find({ institution_id: iOid, term_label: termLabel }).toArray(),
    ]);

    const workingDays = institution?.active_term?.working_days ?? ["Saturday","Sunday","Monday","Tuesday","Wednesday"];
    const dailyStart  = institution?.settings?.daily_start ?? "08:00";
    const slotMins    = institution?.settings?.slot_duration_minutes ?? 60;
    const entries     = [];

    let dayIdx = 0, slotHour = parseInt(dailyStart.split(":")[0]);
    const dailyEndHour = parseInt((institution?.settings?.daily_end ?? "17:00").split(":")[0]);

    for (const course of courses) {
      for (const section of (course.sections ?? [])) {
        const day      = workingDays[dayIdx % workingDays.length];
        const staffMember = staff.find(s =>
          section.assigned_staff?.some(id => id?.toString() === s._id.toString())
        ) ?? staff[dayIdx % Math.max(staff.length, 1)];
        const room = rooms.find(r => r.label === section.required_room_label)
          ?? rooms[dayIdx % Math.max(rooms.length, 1)];

        if (!staffMember || !room) { dayIdx++; continue; }

        const startH = slotHour;
        const endH   = startH + Math.ceil(slotMins / 60);
        if (endH > dailyEndHour) { slotHour = parseInt(dailyStart.split(":")[0]); dayIdx++; continue; }

        entries.push({
          course_id:  course._id,
          section_id: section.section_id,
          room_id:    room._id,
          staff_id:   staffMember._id,
          day,
          start:      `${String(startH).padStart(2,"0")}:00`,
          end:        `${String(endH).padStart(2,"0")}:00`,
        });

        slotHour = endH;
        if (slotHour >= dailyEndHour) { slotHour = parseInt(dailyStart.split(":")[0]); dayIdx++; }
        dayIdx++;
      }
    }

    const scheduleResult = await db.collection("schedules").insertOne({
      institution_id: iOid,
      term_label:     termLabel,
      entries,
      is_published:   false,
      created_at:     new Date(),
    });

    await db.collection("schedule_jobs").updateOne(
      { _id: jobId },
      { $set: { status:"completed", sessions_count: entries.length, schedule_id: scheduleResult.insertedId, status_message:"Done." } }
    );

    return NextResponse.json({
      ok:       true,
      jobId:    jobId.toString(),
      schedule: { id: scheduleResult.insertedId.toString(), entriesCount: entries.length },
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}