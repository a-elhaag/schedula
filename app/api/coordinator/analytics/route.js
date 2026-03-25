import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export const GET = withApiErrorHandling(async function getRoomOccupancy(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId") || null;
    const termLabel = searchParams.get("term") || null;

    const db = await getDb();
    const query = { 
      institution_id: new ObjectId(user.institutionId),
      ...(scheduleId && { _id: new ObjectId(scheduleId) }),
      ...(termLabel && { term_label: termLabel })
    };

    const schedule = await db.collection("schedules").findOne(query);
    if (!schedule?.entries) {
      return jsonOk({ occupancy: {}, days: [], slots: [], summary: {} });
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const slots = ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30"];
    const occupancy = {};

    days.forEach(day => {
      occupancy[day] = slots.map(() => 0);
    });

    let totalSessions = 0;
    let totalCapacity = 0;

    for (const entry of schedule.entries) {
      const dayIdx = days.indexOf(entry.day);
      if (dayIdx === -1) continue;

      const slotIdx = slots.findIndex(slot => 
        slot <= entry.start && slot >= entry.start // Simplified slot matching
      );
      if (slotIdx !== -1) {
        occupancy[days[dayIdx]][slotIdx]++;
        totalSessions++;
      }
    }

    // Normalize to % (assume avg room capacity 30)
    Object.keys(occupancy).forEach(day => {
      occupancy[day] = occupancy[day].map(usage => 
        Math.round((usage / 3) * 100) // Normalize 0-3 sessions -> 0-100%
      );
    });

    return jsonOk({ 
      occupancy,
      days,
      slots,
      summary: { avgOccupancy: Math.round(totalSessions / (days.length * slots.length) * 100) }
    });
  } catch (error) {
    throw error;
  }
});

