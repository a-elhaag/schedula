import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import {
  ScheduleJobStatus,
} from "@/lib/scheduleJobContract";
import { runSolver } from "@/lib/solver/index";

// ── GET /api/coordinator/schedule/generate ────────────────────────────────────
// Returns readiness stats + recent jobs. Polls job status if jobId provided.
export async function GET(request) {
  try {
    const user  = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid  = await resolveInstitutionId(user.institutionId);
    const db    = await getDb();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId && ObjectId.isValid(jobId)) {
      const job = await db.collection("schedule_jobs").findOne({ _id: new ObjectId(jobId) });
      if (!job) return NextResponse.json({ status: "not_found" });
      return NextResponse.json({
        status:        job.status,
        statusMessage: job.status_message ?? "Processing...",
        error:         job.error  ?? null,
        schedule:      job.schedule_id ? { id: job.schedule_id.toString() } : null,
        stats:         job.stats  ?? null,
      });
    }

    const [coursesCount, staffCount, availCount, levelsConfig, recentJobs] = await Promise.all([
      db.collection("courses").countDocuments({ institution_id: iOid, deleted_at: null }),
      db.collection("users").countDocuments({ institution_id: iOid, deleted_at: null, role: { $in: ["professor","ta"] } }),
      db.collection("availability").countDocuments({ institution_id: iOid }),
      db.collection("settings").findOne({ institution_id: iOid, type: "levels_config" }),
      db.collection("schedule_jobs").find({ institution_id: iOid }).sort({ created_at: -1 }).limit(5).toArray(),
    ]);

    return NextResponse.json({
      stats: { courses: coursesCount, staff: staffCount },
      readiness: {
        courses:      coursesCount > 0,
        staff:        staffCount   > 0,
        availability: availCount   > 0,
        levels:       !!levelsConfig,
      },
      recentJobs: recentJobs.map(j => ({
        id:             j._id.toString(),
        status:         j.status,
        status_message: j.status_message ?? null,
        term_label:     j.term_label,
        sessions_count: j.sessions_count ?? 0,
        error:          j.error   ?? null,
        created_at:     j.created_at,
        stats:          j.stats   ?? null,
      })),
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/schedule/generate ───────────────────────────────────
// Creates a schedule job and runs the 3-phase solver asynchronously.
export async function POST(request) {
  try {
    const user  = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid  = await resolveInstitutionId(user.institutionId);
    const db    = await getDb();

    const institution = await db.collection("institutions").findOne({ _id: iOid });
    const termLabel   = institution?.active_term?.label ?? "Spring 2026";

    const job = {
      institution_id: iOid,
      term_label:     termLabel,
      status:         ScheduleJobStatus.RUNNING,
      status_message: "Initializing solver...",
      created_at:     new Date(),
      created_by:     ObjectId.isValid(user.userId) ? new ObjectId(user.userId) : null,
    };
    const jobResult = await db.collection("schedule_jobs").insertOne(job);
    const jobId     = jobResult.insertedId;

    const updateJob = (patch) =>
      db.collection("schedule_jobs").updateOne({ _id: jobId }, { $set: patch });

    // Run solver asynchronously — HTTP returns immediately for client polling
    const runAsync = async () => {
      try {
        await updateJob({ status_message: "Expanding sessions..." });

        const result = await runSolver(iOid.toString(), termLabel);

        if (result.infeasible.length > 0) {
          await updateJob({
            status:         ScheduleJobStatus.FAILED_INFEASIBLE,
            status_message: "Solver could not find valid slots for some sessions.",
            error: {
              type:    "infeasible",
              message: `${result.infeasible.length} session(s) have no valid slot.`,
              details: result.infeasible,
            },
            stats: result.stats,
          });
          return;
        }

        const scheduleResult = await db.collection("schedules").insertOne({
          institution_id: iOid,
          term_label:     termLabel,
          entries:        result.entries,
          is_published:   false,
          created_at:     new Date(),
        });

        await updateJob({
          status:         result.stats.success
            ? ScheduleJobStatus.COMPLETED
            : ScheduleJobStatus.COMPLETED_FALLBACK,
          status_message: result.stats.success
            ? "Schedule generated successfully."
            : "Partial schedule generated — some sessions could not be placed.",
          sessions_count: result.entries.length,
          schedule_id:    scheduleResult.insertedId,
          error:          null,
          stats:          result.stats,
        });

      } catch (err) {
        await updateJob({
          status:         ScheduleJobStatus.FAILED,
          status_message: "Solver error.",
          error:          { type: "solver_error", message: err.message },
        });
      }
    };

    runAsync().catch(console.error);

    return NextResponse.json({
      ok:      true,
      jobId:   jobId.toString(),
      message: "Solver started. Poll for status.",
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
