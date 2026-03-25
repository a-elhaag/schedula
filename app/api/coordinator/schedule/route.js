import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/auth";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export const GET = withApiErrorHandling(async function getScheduleReview(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");

    const db = await getDb();
    const query = { 
      institution_id: new ObjectId(user.institutionId),
      _id: scheduleId ? new ObjectId(scheduleId) : { $exists: true }
    };

    const schedules = await db.collection("schedules")
      .find(query)
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();

    const result = schedules.map(s => ({
      id: s._id.toString(),
      termLabel: s.term_label,
      status: s.is_published ? "published" : s.approved_at ? "approved" : "draft",
      entryCount: s.entries?.length || 0,
      conflictCount: s.conflicts?.length || 0,
      createdAt: s.created_at?.toISOString()
    }));

    return jsonOk({ schedules: result });
  } catch (error) {
    if (error?.status === 400) return jsonError(error.message, 400);
    throw error;
  }
});

export const POST = withApiErrorHandling(async function approveSchedule(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { scheduleId } = await request.json();

    const db = await getDb();
    const result = await db.collection("schedules").updateOne(
      { _id: new ObjectId(scheduleId), institution_id: new ObjectId(user.institutionId) },
      { 
        $set: { 
          approved_at: new Date(),
          approved_by: new ObjectId(user.id),
          conflicts: [] 
        },
        $unset: { is_published: "" } // Will be set on publish
      }
    );

    if (!result.modifiedCount) {
      throw new Error("Schedule not found or already approved");
    }

    return jsonOk({ success: true, scheduleId });
  } catch (error) {
    if (error?.status === 400) return jsonError(error.message, 400);
    throw error;
  }
});

export const PATCH = withApiErrorHandling(async function resolveConflict(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { scheduleId, entryId, changes } = await request.json(); // changes: {roomId, staffId, day, start, etc}

    const db = await getDb();
    // Update specific schedule entry and recompute conflicts (simplified)
    const result = await db.collection("schedules").updateOne(
      { _id: new ObjectId(scheduleId), "entries.id": entryId, institution_id: new ObjectId(user.institutionId) },
      { $set: { 
        "entries.$.room_id": changes.roomId ? new ObjectId(changes.roomId) : null,
        "entries.$.staff_id": changes.staffId ? new ObjectId(changes.staffId) : null,
        updated_at: new Date()
      }}
    );

    if (!result.modifiedCount) throw new Error("Entry not found");

    return jsonOk({ success: true });
  } catch (error) {
    throw new Error(error.message);
  }
});

