// lib/solver/expand.js
import { allSubgroupsForLevel } from "./subgroups.js";

/**
 * Expand a single course into individual schedulable sessions.
 *
 * Session shape:
 * {
 *   id:             string  (unique within the solver run)
 *   course_id:      ObjectId
 *   course_code:    string
 *   course_name:    string
 *   level:          number
 *   session_type:   "lecture"|"tutorial"|"lab"
 *   staff_id:       ObjectId|null
 *   groups_covered: string[]  (group_ids — for lectures)
 *   subgroup:       string|null  (null for lectures)
 *   duration:       number  (minutes)
 * }
 */
export function expandCourse(course, levelEntry) {
  const sessions  = [];
  const allGroups = levelEntry.groups;

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
        staff_id:       course.professor_id ?? null,
        groups_covered: batch.map(g => g.group_id),
        subgroup:       null,
        duration:       120,
      });
    }
  }

  const subgroupUnits = allSubgroupsForLevel(levelEntry);

  // ── Tutorials ───────────────────────────────────────────────────────────────
  if (course.has_tutorial) {
    for (const { group_id, subgroup } of subgroupUnits) {
      sessions.push({
        id:             `${course._id}-tut-${subgroup ?? group_id}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "tutorial",
        staff_id:       course.ta_ids?.[0] ?? null,
        groups_covered: [group_id],
        subgroup:       subgroup ?? group_id,
        duration:       120,
      });
    }
  }

  // ── Labs ────────────────────────────────────────────────────────────────────
  if (course.has_lab) {
    for (const { group_id, subgroup } of subgroupUnits) {
      sessions.push({
        id:             `${course._id}-lab-${subgroup ?? group_id}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "lab",
        staff_id:       course.ta_ids?.[0] ?? null,
        groups_covered: [group_id],
        subgroup:       subgroup ?? group_id,
        duration:       60,
      });
    }
  }

  // ── Tut+Lab (combined — creates separate tut and lab sessions) ───────────────
  if (course.has_tut_lab) {
    for (const { group_id, subgroup } of subgroupUnits) {
      const key = subgroup ?? group_id;
      sessions.push({
        id:             `${course._id}-tutlab-tut-${key}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "tutorial",
        staff_id:       course.ta_ids?.[0] ?? null,
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
        staff_id:       course.ta_ids?.[0] ?? null,
        groups_covered: [group_id],
        subgroup:       key,
        duration:       60,
      });
    }
  }

  return sessions;
}

/**
 * Expand ALL courses for ALL levels, in DESCENDING level order (highest first).
 * L4 sessions are placed in the array before L3, L2, L1, Freshman — giving the
 * backtracker first pick of slots for smaller/simpler levels.
 *
 * @param {object[]} courses - raw course docs from DB
 * @param {Map} levelMap - from buildLevelMap()
 * @returns {object[]} flat array of all sessions
 */
export function expandAll(courses, levelMap) {
  const levels = [...levelMap.keys()].sort((a, b) => b - a); // descending
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
