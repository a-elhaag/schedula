import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

const DAYS  = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
const SLOTS = ["07:30","08:30","09:30","10:30","11:30","12:30","1:30","2:30","3:30","4:30"];

// ── GET /api/coordinator/analytics ───────────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });

    const db   = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    // Get latest published (or any) schedule
    const schedule = await db.collection("schedules").findOne(
      { institution_id: iOid },
      { sort: { created_at: -1 } }
    );

    const totalRooms = await db.collection("rooms").countDocuments({
      institution_id: iOid, deleted_at: null,
    });

    if (!schedule?.entries?.length) {
      return NextResponse.json({
        heatmap:      {},
        stats:        { totalSessions: 0, peakOccupancy: 0, peakSlot: "--", roomsUsed: 0, totalRooms },
        topRooms:     [],
        activeDays:   [],
      });
    }

    const entries = schedule.entries;

    // Build heatmap: for each day+slot, count how many sessions overlap
    const slotCounts = {};
    DAYS.forEach(d => {
      slotCounts[d] = {};
      SLOTS.forEach(s => { slotCounts[d][s] = 0; });
    });

    for (const entry of entries) {
      const day = entry.day;
      if (!slotCounts[day]) continue;
      for (const slot of SLOTS) {
        if (entry.start <= slot && slot < entry.end) {
          slotCounts[day][slot]++;
        }
      }
    }

    // Convert counts to occupancy percentages
    const heatmap = {};
    let peakOccupancy = 0;
    let peakSlot = "";
    DAYS.forEach(d => {
      heatmap[d] = {};
      SLOTS.forEach(s => {
        const pct = totalRooms > 0 ? Math.round((slotCounts[d][s] / totalRooms) * 100) : 0;
        heatmap[d][s] = Math.min(pct, 100);
        if (pct > peakOccupancy) {
          peakOccupancy = pct;
          peakSlot = `${d} ${s}`;
        }
      });
    });

    // Rooms usage frequency
    const roomCounts = {};
    for (const entry of entries) {
      const rid = entry.room_id?.toString();
      if (rid) roomCounts[rid] = (roomCounts[rid] ?? 0) + 1;
    }

    const roomIds  = Object.keys(roomCounts);
    const rooms    = await db.collection("rooms").find({ _id: { $in: roomIds.map(id => new ObjectId(id)) } }).toArray();
    const roomMap  = Object.fromEntries(rooms.map(r => [r._id.toString(), r]));
    const maxCount = Math.max(...Object.values(roomCounts), 1);

    const topRooms = roomIds
      .sort((a, b) => roomCounts[b] - roomCounts[a])
      .slice(0, 6)
      .map(id => ({
        name:      roomMap[id]?.name ?? id,
        count:     roomCounts[id],
        occupancy: Math.round((roomCounts[id] / maxCount) * 100),
      }));

    // Sessions per day
    const dayCounts = {};
    for (const entry of entries) {
      dayCounts[entry.day] = (dayCounts[entry.day] ?? 0) + 1;
    }
    const maxDay = Math.max(...Object.values(dayCounts), 1);
    const activeDays = DAYS.filter(d => dayCounts[d] > 0).map(d => ({
      day:   d,
      count: dayCounts[d],
      pct:   Math.round((dayCounts[d] / maxDay) * 100),
    }));

    return NextResponse.json({
      heatmap,
      stats: {
        totalSessions: entries.length,
        peakOccupancy,
        peakSlot,
        roomsUsed: roomIds.length,
        totalRooms,
      },
      topRooms,
      activeDays,
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}