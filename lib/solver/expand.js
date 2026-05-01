// lib/solver/expand.js
import { allSubgroupsForLevel } from "./subgroups.js";

/**
 * Normalize a staff_id (ObjectId or string) to a plain string, or null.
 */
function staffStr(id) {
  if (!id) return null;
  return id.toString();
}

/**
 * Expand a single course into individual schedulable sessions.
 * TAs are distributed round-robin across subgroups so no single TA
 * is assigned to all subgroups (which would cause guaranteed conflicts).
 *
 * staff_id is always stored as a plain string (never ObjectId) so
 * comparisons in the conflict checker are always string === string.
 */
export function expandCourse(course, levelEntry) {
  const sessions  = [];
  const allGroups = levelEntry.groups;
  const taIds     = (course.ta_ids ?? []).map(staffStr).filter(Boolean);
  const profId    = staffStr(course.professor_id);

  // ── Lectures ────────────────────────────────────────────────────────────────
  if (course.has_lecture) {
    const gpl = Math.max(1, course.groups_per_lecture ?? 1);
    for (let i = 0; i < allGroups.length; i += gpl) {
      const batch = allGroups.slice(i, i + gpl);
      sessions.push({
        id:             `${course._id}-lec-batch${i}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "lecture",
        staff_id:       profId,
        groups_covered: batch.map(g => g.group_id),
        subgroup:       null,
        duration:       120,
      });
    }
  }

  const subgroupUnits = allSubgroupsForLevel(levelEntry);

  // ── Tutorials — round-robin TAs ─────────────────────────────────────────────
  if (course.has_tutorial) {
    subgroupUnits.forEach(({ group_id, subgroup }, idx) => {
      // Each subgroup gets a different TA cycling through the ta_ids list
      const ta = taIds.length > 0 ? taIds[idx % taIds.length] : null;
      sessions.push({
        id:             `${course._id}-tut-${subgroup ?? group_id}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "tutorial",
        staff_id:       ta,
        groups_covered: [group_id],
        subgroup:       subgroup ?? group_id,
        duration:       120,
      });
    });
  }

  // ── Labs — round-robin TAs ───────────────────────────────────────────────────
  if (course.has_lab) {
    subgroupUnits.forEach(({ group_id, subgroup }, idx) => {
      const ta = taIds.length > 0 ? taIds[idx % taIds.length] : null;
      sessions.push({
        id:             `${course._id}-lab-${subgroup ?? group_id}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "lab",
        staff_id:       ta,
        groups_covered: [group_id],
        subgroup:       subgroup ?? group_id,
        duration:       60,
      });
    });
  }

  // ── Tut+Lab — round-robin TAs ────────────────────────────────────────────────
  if (course.has_tut_lab) {
    subgroupUnits.forEach(({ group_id, subgroup }, idx) => {
      const key = subgroup ?? group_id;
      const ta  = taIds.length > 0 ? taIds[idx % taIds.length] : null;
      sessions.push({
        id:             `${course._id}-tutlab-tut-${key}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "tutorial",
        staff_id:       ta,
        groups_covered: [group_id],
        subgroup:       key,
        duration:       120,
      });
      sessions.push({
        id:             `${course._id}-tutlab-lab-${key}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "lab",
        staff_id:       ta,
        groups_covered: [group_id],
        subgroup:       key,
        duration:       60,
      });
    });
  }

  return sessions;
}

/**
 * Expand all courses for all levels in descending level order.
 * Returns sessions grouped by level for per-level scheduling.
 */
export function expandAll(courses, levelMap) {
  const levels = [...levelMap.keys()].sort((a, b) => b - a);
  const sessions = [];
  for (const level of levels) {
    const levelEntry   = levelMap.get(level);
    const levelCourses = courses.filter(c => c.level === level && !c.deleted_at);
    for (const course of levelCourses) {
      sessions.push(...expandCourse(course, levelEntry));
    }
  }
  return sessions;
}

/**
 * Expand courses grouped by level — returns Map<level, session[]>.
 * Used for per-level schedule generation.
 */
export function expandByLevel(courses, levelMap) {
  const levels = [...levelMap.keys()].sort((a, b) => b - a);
  const byLevel = new Map();
  for (const level of levels) {
    const levelEntry   = levelMap.get(level);
    const levelCourses = courses.filter(c => c.level === level && !c.deleted_at);
    const sessions     = [];
    for (const course of levelCourses) {
      sessions.push(...expandCourse(course, levelEntry));
    }
    byLevel.set(level, sessions);
  }
  return byLevel;
}
