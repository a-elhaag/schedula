import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";

function parseRevisionNumber(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function makeIdentity(entry) {
  return [
    entry.course_id?.toString?.() ?? String(entry.course_id ?? ""),
    entry.section_id ?? "",
    entry.day ?? "",
    entry.start ?? "",
    entry.end ?? "",
  ].join("|");
}

function enrichEntry(entry, maps) {
  const courseId = entry.course_id?.toString?.() ?? String(entry.course_id ?? "");
  const roomId = entry.room_id?.toString?.() ?? String(entry.room_id ?? "");
  const staffId = entry.staff_id?.toString?.() ?? String(entry.staff_id ?? "");

  const course = maps.courseMap[courseId];
  const room = maps.roomMap[roomId];
  const staff = maps.staffMap[staffId];
  const section = course?.sections?.find((s) => s.section_id === entry.section_id);

  return {
    identity: makeIdentity(entry),
    courseId,
    sectionId: entry.section_id,
    code: course?.code ?? "--",
    courseName: course?.name ?? "--",
    type: section?.type ?? "lecture",
    day: entry.day,
    start: entry.start,
    end: entry.end,
    roomId,
    room: room?.name ?? room?.label ?? "--",
    staffId,
    instructor: staff?.name ?? "TBA",
  };
}

function indexByIdentity(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.identity, entry);
  }
  return map;
}

export async function GET(request) {
  try {
    const user = getCurrentUser(request, { requiredRole: "coordinator" });
    const iOid = await resolveInstitutionId(user.institutionId);
    const db = await getDb();

    const { searchParams } = new URL(request.url);
    const leftRevision = parseRevisionNumber(searchParams.get("left"));
    const rightRevision = parseRevisionNumber(searchParams.get("right"));
    const termLabel = searchParams.get("termLabel");

    if (!leftRevision || !rightRevision) {
      return NextResponse.json(
        { message: "left and right revision numbers are required" },
        { status: 400 }
      );
    }

    const baseQuery = {
      institution_id: iOid,
      deleted_at: null,
    };

    if (termLabel) {
      baseQuery.term_label = termLabel;
    }

    const [leftDoc, rightDoc] = await Promise.all([
      db.collection("schedule_revisions").findOne({
        ...baseQuery,
        revision_number: leftRevision,
      }),
      db.collection("schedule_revisions").findOne({
        ...baseQuery,
        revision_number: rightRevision,
      }),
    ]);

    if (!leftDoc || !rightDoc) {
      return NextResponse.json(
        { message: "One or both revisions were not found" },
        { status: 404 }
      );
    }

    const allEntries = [...(leftDoc.entries ?? []), ...(rightDoc.entries ?? [])];
    const courseIds = [...new Set(allEntries.map((e) => e.course_id?.toString()).filter(Boolean))];
    const roomIds = [...new Set(allEntries.map((e) => e.room_id?.toString()).filter(Boolean))];
    const staffIds = [...new Set(allEntries.map((e) => e.staff_id?.toString()).filter(Boolean))];

    const [courses, rooms, staff] = await Promise.all([
      courseIds.length
        ? db.collection("courses").find({ _id: { $in: courseIds.map((id) => new ObjectId(id)) } }).toArray()
        : [],
      roomIds.length
        ? db.collection("rooms").find({ _id: { $in: roomIds.map((id) => new ObjectId(id)) } }).toArray()
        : [],
      staffIds.length
        ? db.collection("users").find({ _id: { $in: staffIds.map((id) => new ObjectId(id)) } }).toArray()
        : [],
    ]);

    const maps = {
      courseMap: Object.fromEntries(courses.map((c) => [c._id.toString(), c])),
      roomMap: Object.fromEntries(rooms.map((r) => [r._id.toString(), r])),
      staffMap: Object.fromEntries(staff.map((s) => [s._id.toString(), s])),
    };

    const leftEntries = (leftDoc.entries ?? []).map((entry) => enrichEntry(entry, maps));
    const rightEntries = (rightDoc.entries ?? []).map((entry) => enrichEntry(entry, maps));

    const leftIndex = indexByIdentity(leftEntries);
    const rightIndex = indexByIdentity(rightEntries);

    const added = [];
    const removed = [];
    const reassigned = [];

    for (const [identity, rightEntry] of rightIndex.entries()) {
      if (!leftIndex.has(identity)) {
        added.push(rightEntry);
        continue;
      }

      const leftEntry = leftIndex.get(identity);
      if (leftEntry.roomId !== rightEntry.roomId || leftEntry.staffId !== rightEntry.staffId) {
        reassigned.push({
          identity,
          before: leftEntry,
          after: rightEntry,
        });
      }
    }

    for (const [identity, leftEntry] of leftIndex.entries()) {
      if (!rightIndex.has(identity)) {
        removed.push(leftEntry);
      }
    }

    const unchanged =
      rightEntries.length - added.length - reassigned.length;

    return NextResponse.json({
      termLabel: rightDoc.term_label ?? leftDoc.term_label,
      left: {
        revisionNumber: leftDoc.revision_number,
        publishedAt: leftDoc.published_at ?? null,
        sessionCount: leftEntries.length,
      },
      right: {
        revisionNumber: rightDoc.revision_number,
        publishedAt: rightDoc.published_at ?? null,
        sessionCount: rightEntries.length,
      },
      summary: {
        added: added.length,
        removed: removed.length,
        reassigned: reassigned.length,
        unchanged: Math.max(unchanged, 0),
      },
      changes: {
        added,
        removed,
        reassigned,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { message: err.message ?? "Server error" },
      { status: err.status ?? 500 }
    );
  }
}
