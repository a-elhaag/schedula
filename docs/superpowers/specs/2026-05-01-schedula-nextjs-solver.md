# Schedula — Next.js Solver & Schema Redesign Spec

**Date:** 2026-05-01  
**Status:** Approved for planning

---

## 1. Goal

Replace the FastAPI solver dependency with a pure Next.js constraint-based schedule generator. Redesign the course, groups, and schedule DB schemas to support a generic multi-tenant university scheduling SaaS. Rooms are hardcoded for now. The solver minimises student campus days and idle gaps.

---

## 2. What This Is NOT

- Not a UI redesign (existing pages are kept unless explicitly changed)
- Not removing auth, staff management, or import/export
- Not a multi-tenant admin system — one institution per deployment for now
- Not replacing the fallback structure — the background job + polling pattern stays

---

## 3. Institution Configuration (coordinator-set, one-time setup)

The coordinator configures the institution during onboarding:

```
Campus working days: e.g. ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"]
Daily time grid:
  - start_time: "08:30"
  - period_duration_minutes: 60
  - num_periods: 10   → P1=08:30–09:30, P2=09:30–10:30 ... P10=17:30–18:30
```

No per-level day restrictions. The solver assigns sessions to any campus working day, optimising to pack each level's sessions onto as few days as possible.

---

## 4. Groups & Levels Configuration

### 4.1 Levels

- Levels are numbered integers. Can start from 0 (Freshman) or 1.
- Level 0 = Freshman by convention (optional — institution may not have it).
- Each institution configures how many levels it has and what to call them.

### 4.2 Groups & Subgroups

- Each level has N groups.
- Each group has M subgroups (M can vary per group, even within the same level).
- Subgroup naming follows ECU convention as the system standard:
  - Level 0 (Freshman): `GA-1, GA-2, ... / GB-1, GB-2, ...`
  - Level 1+: `G1-1, G1-2, G1-3 / G2-1, G2-2, ...`
- Names are auto-generated from group count + subgroup count. Coordinator sets numbers only.

### 4.3 Settings Collection Shape (new)

```js
// collection: settings
// type: "levels_config"
{
  institution_id: ObjectId,
  type: "levels_config",
  data: {
    levels: [
      {
        level: 0,                          // integer — 0 = Freshman
        label: "Freshman",                 // display name
        groups: [
          { group_id: "GA", subgroup_count: 12 },
          { group_id: "GB", subgroup_count: 9 },
        ]
      },
      {
        level: 1,
        label: "Level 1",
        groups: [
          { group_id: "G1", subgroup_count: 3 },
          { group_id: "G2", subgroup_count: 3 },
          { group_id: "G3", subgroup_count: 3 },
        ]
      },
      {
        level: 2,
        label: "Level 2",
        groups: [
          { group_id: "G1", subgroup_count: 3 },
          { group_id: "G2", subgroup_count: 3 },
        ]
      },
      {
        level: 3,
        label: "Level 3",
        groups: [
          { group_id: "G1", subgroup_count: 3 },
          { group_id: "G2", subgroup_count: 2 },
        ]
      },
      {
        level: 4,
        label: "Level 4",
        groups: [
          { group_id: "G1", subgroup_count: 0 },  // 0 = no subgroups (L4 style)
        ]
      }
    ]
  },
  updated_at: Date
}
```

Subgroup names are **derived** at runtime from `group_id` + `subgroup_count`:
```js
// group_id="G1", subgroup_count=3 → ["G1-1","G1-2","G1-3"]
// group_id="GA", subgroup_count=12 → ["GA-1","GA-2",...,"GA-12"]
// subgroup_count=0 → no subgroups, group is treated as a single unit
```

---

## 5. Rooms — Hardcoded

Rooms are a constant in `lib/rooms.js`. No DB collection. No UI. No API routes.

```js
// lib/rooms.js
export const ROOMS = [
  // Lecture Halls — can host multiple groups simultaneously
  { code: "A202", wing: "A", type: "LECTURE_HALL" },
  { code: "A207", wing: "A", type: "LECTURE_HALL" },
  { code: "A302", wing: "A", type: "LECTURE_HALL" },
  { code: "A307", wing: "A", type: "LECTURE_HALL" },
  { code: "A308", wing: "A", type: "LECTURE_HALL" },
  { code: "A312", wing: "A", type: "LECTURE_HALL" },
  { code: "E-4",  wing: "E", type: "LECTURE_HALL" },

  // A-wing Labs
  { code: "A203", wing: "A", type: "LAB" },
  { code: "A206", wing: "A", type: "LAB" },
  { code: "A303", wing: "A", type: "LAB" },
  { code: "A310", wing: "A", type: "LAB" },
  { code: "A311", wing: "A", type: "LAB" },
  { code: "A313", wing: "A", type: "LAB" },

  // D-wing Tutorial Rooms
  { code: "D101", wing: "D", type: "TUTORIAL" },
  { code: "D102", wing: "D", type: "TUTORIAL" },
  { code: "D103", wing: "D", type: "TUTORIAL" },
  { code: "D104", wing: "D", type: "TUTORIAL" },
  { code: "D106", wing: "D", type: "TUTORIAL" },
  { code: "D107", wing: "D", type: "TUTORIAL" },
  { code: "D109", wing: "D", type: "TUTORIAL" },
  { code: "D110", wing: "D", type: "TUTORIAL" },
  { code: "D112", wing: "D", type: "TUTORIAL" },
  { code: "D201", wing: "D", type: "TUTORIAL" },
  { code: "D204", wing: "D", type: "TUTORIAL" },
  { code: "D205", wing: "D", type: "TUTORIAL" },

  // C-wing Specialist Labs
  { code: "C107", wing: "C", type: "LAB" },
  { code: "C120", wing: "C", type: "LAB" },
  { code: "C205", wing: "C", type: "LAB" },
  { code: "C207", wing: "C", type: "LAB" },

  // E-wing Chemistry Labs
  { code: "E102", wing: "E", type: "LAB" },
  { code: "E103", wing: "E", type: "LAB" },
  { code: "E106", wing: "E", type: "LAB" },
];

export const ROOM_BY_CODE = Object.fromEntries(ROOMS.map(r => [r.code, r]));
export const LECTURE_HALLS = ROOMS.filter(r => r.type === "LECTURE_HALL");
export const TUTORIAL_ROOMS = ROOMS.filter(r => r.type === "TUTORIAL");
export const LAB_ROOMS = ROOMS.filter(r => r.type === "LAB");
```

---

## 6. Courses Schema Redesign

### 6.1 What changes

The existing `courses` collection uses a `sections[]` sub-document array. This is replaced with flat top-level fields.

### 6.2 New `courses` document shape

```js
{
  institution_id:     ObjectId,
  code:               "SET221",        // uppercase, unique per institution
  name:               "Electronic Design Automation",
  credit_hours:       3,
  level:              2,               // integer matching levels_config

  // Session type flags
  has_lecture:        true,
  has_tutorial:       false,
  has_lab:            true,
  has_tut_lab:        false,           // combined tutorial+lab session

  // Lecture grouping — how many groups share one lecture session
  // e.g. 1 = each group gets its own lecture
  //      2 = every 2 groups share one lecture
  //      99 = all groups share one lecture
  groups_per_lecture: 1,

  // Staff
  professor_id:       ObjectId | null, // assigned professor (teaches LEC)
  ta_ids:             [ObjectId],      // assigned TAs (teach TUT/LAB)

  created_at:         Date,
  deleted_at:         null
}
```

### 6.3 Fixed session durations (constants, not stored)

```js
// lib/durations.js
export const DURATIONS = {
  lecture:  120,  // 2 hours
  tutorial: 120,  // 2 hours
  lab:       60,  // 1 hour
  // tut_lab = tutorial session (120min) + lab session (60min) scheduled separately
}
```

---

## 7. Availability Schema Change

Staff mark which **days** they are available — no period/slot granularity.

```js
// collection: availability
{
  institution_id: ObjectId,
  user_id:        ObjectId,
  term_label:     "Spring 2026",
  available_days: ["Saturday", "Monday", "Wednesday"],  // subset of campus working days
  submitted_at:   Date,
  updated_at:     Date
}
```

The solver HC-10 check becomes: `session.day ∈ instructor.available_days`.

---

## 8. Schedule Entry Shape (enriched)

```js
// inside schedules.entries[]  and  schedule_snapshots.entries[]
{
  course_id:      ObjectId,
  course_code:    "SET221",           // denormalised
  course_name:    "Electronic Design Automation", // denormalised
  session_type:   "lecture",          // "lecture"|"tutorial"|"lab"|"tut_lab"
  level:          2,
  room_code:      "A207",             // string code — no ObjectId (rooms are hardcoded)
  staff_id:       ObjectId,
  day:            "Saturday",
  period:         1,                  // P1–P10 integer
  start:          "08:30",            // derived from period + institution time grid
  end:            "10:30",            // derived from period + duration
  subgroup:       null,               // null for lectures, "G1-1" for tut/lab
  groups_covered: ["G1", "G2"],       // for lectures: which groups attend
}
```

---

## 9. schedule_jobs Schema Fix

Current validator uses `triggered_by`/`triggered_at` but code writes `created_by`/`created_at`. Status enum is missing values.

```js
// Corrected schedule_jobs document shape
{
  institution_id:  ObjectId,
  term_label:      "Spring 2026",
  status:          "running",  // "pending"|"running"|"completed"|"completed_fallback"|"failed"|"failed_infeasible"
  status_message:  "Initializing...",
  created_by:      ObjectId,
  created_at:      Date,
  completed_at:    Date | null,
  sessions_count:  0,
  schedule_id:     ObjectId | null,
  error:           null | { type, message, details }
}
```

---

## 10. Solver Algorithm — 3-Phase

### 10.1 Input preparation

```
1. Load from DB:
   - institution time grid (working days, period count, start time, period duration)
   - levels_config (levels, groups, subgroup counts)
   - courses (with professor_id, ta_ids, session flags, groups_per_lecture, level)
   - availability (user_id → available_days[])

2. Derive subgroup names:
   group_id="G1", subgroup_count=3 → ["G1-1","G1-2","G1-3"]

3. Pre-expand courses into sessions (descending level order: L4 first, Freshman last):
   for each level (descending):
     for each course at this level:
       if has_lecture:
         groups = all groups at this level
         batches = chunk(groups, groups_per_lecture)
         for each batch:
           create 1 LEC session { course, professor_id, groups_covered: batch, session_type: "lecture" }
       if has_tutorial:
         for each subgroup across all groups:
           create 1 TUT session { course, ta_ids, subgroup, session_type: "tutorial" }
       if has_lab:
         for each subgroup:
           create 1 LAB session { course, ta_ids, subgroup, session_type: "lab" }
       if has_tut_lab:
         for each subgroup:
           create 1 TUT session + 1 LAB session (linked pair)
```

### 10.2 Phase 1 — AC-3 Domain Trimming

For each session, compute its valid slots domain `(day, period)`:

```
Remove day if:
  - day not in campus working days
  - instructor not available on that day (HC-10)

Remove (day, period) if:
  - period > num_periods
  - no room of matching type exists (HC-6) — if all rooms occupied, skip
```

Sessions with empty domain after trimming → infeasibility report, abort.

### 10.3 Phase 2 — Greedy Backtracker with Forward Checking

```
Sort sessions by domain size ascending (MCV — most constrained first):
  - Lectures with many groups_covered → first
  - Sessions whose instructor has fewest available days → first
  - Lab sessions (fewer rooms) before tutorials

For each session (in sorted order):
  candidates = valid (day, period, room) tuples
  Score candidates (prefer days group already has sessions on → pack days)
  For each candidate (best score first):
    tentatively assign session to candidate
    run forward check: does any unassigned session now have empty domain?
    if no conflict:
      recurse to next session
      if solution found: return
    unassign (backtrack)

If backtracks > 1000: restart with shuffled order (up to 5 restarts)
If no solution after 5 restarts: return best partial + infeasibility report
```

### 10.4 Phase 3 — Simulated Annealing Post-Processing

Runs for fixed 800ms budget after Phase 2 finds a feasible solution.

```
cost(schedule) =
  w1 × Σ(distinct days each subgroup attends)      // minimise campus days
  w2 × Σ(idle gap minutes per subgroup per day)    // minimise waiting gaps
  w3 × Σ(soft constraint violations)               // SC-1 to SC-9

temperature = 1.0
cooling_rate = 0.995

while time_budget remaining:
  pick two random sessions
  try swapping their (day, period, room)
  if swap is HC-valid:
    delta = cost(new) - cost(current)
    if delta < 0 OR random() < e^(-delta/temperature):
      accept swap
  temperature *= cooling_rate
```

### 10.5 Hard Constraints enforced throughout

```
HC-1: no two sessions in same room on same (day, period)
HC-2: no instructor teaching two sessions on same (day, period)
HC-3: no group attending two lectures on same (day, period)
HC-4: no subgroup in two sessions on same (day, period)
HC-5: all sessions assigned
HC-6: room type matches session type (LECTURE_HALL→lecture, TUTORIAL→tutorial, LAB→lab)
HC-7: (removed — solver uses all campus working days, no per-level restriction)
HC-8: period must be within 1–num_periods
HC-9: professor → LEC only, TA → TUT/LAB only
HC-10: instructor available on assigned day
```

---

## 11. Schedule Output View

The published schedule is displayed as a grid per level:

```
Columns: one per subgroup (e.g. G1-1 | G1-2 | G1-3 | G2-1 | G2-2 | G2-3)
Rows:    day × period (e.g. Saturday P1 → Thursday P10)
Cell:    "RoomCode - CourseCode - CourseName\nInstructorName"
Lecture: spans the columns of all groups_covered subgroups
```

Level selector tabs at the top (L4 | L3 | L2 | L1 | Freshman).

---

## 12. Files to Create / Modify / Remove

### New files
```
lib/rooms.js                          — hardcoded room constant
lib/durations.js                      — fixed session durations
lib/solver/expand.js                  — course → session pre-expansion
lib/solver/domains.js                 — AC-3 domain trimming
lib/solver/backtrack.js               — Phase 2 greedy backtracker
lib/solver/anneal.js                  — Phase 3 SA post-processor
lib/solver/cost.js                    — soft constraint cost function
lib/solver/index.js                   — orchestrates all 3 phases
lib/solver/subgroups.js               — subgroup name derivation utility
scripts/migrate-schema.mjs            — DB migration script
scripts/setup-db-v2.mjs               — updated setup script with new schemas
```

### Modified files
```
app/api/coordinator/schedule/generate/route.js   — replace FastAPI + fallback with lib/solver
app/api/coordinator/courses/route.js             — new course shape (level, flags, professor_id, ta_ids)
app/api/coordinator/courses/[id]/route.js        — update for new shape
app/api/coordinator/groups/route.js              — new levels_config shape
app/api/staff/availability/route.js              — available_days[] instead of slots[]
app/api/coordinator/availability/status/route.js — read available_days[]
app/coordinator/courses/page.js                  — new form (level, groups_per_lecture, assign prof+TAs)
app/coordinator/groups/page.js                   — new levels_config UI
app/coordinator/schedule/published/page.js       — new grid view with level tabs
app/coordinator/schedule/review/route.js         — read new entry shape
lib/server/coordinatorService.js                 — remove room functions, update course functions
middleware.js                                    — rename from proxy.js + fix export name (BUG-001/002)
```

### Removed files
```
app/api/coordinator/rooms/route.js
app/api/coordinator/rooms/[id]/route.js
app/coordinator/rooms/page.js
app/coordinator/rooms/styles.css
proxy.js                                         — replaced by middleware.js
```

---

## 13. DB Migration

The migration script must:

1. **courses collection** — for each existing course document:
   - Read `sections[]` to derive `has_lecture`, `has_tutorial`, `has_lab`
   - Extract `year_levels` from first section → set as top-level `level` (use `year_levels[0]`)
   - Set `groups_per_lecture: 1` (safe default)
   - Set `professor_id: null`, `ta_ids: []`
   - Remove `sections` array
   - Add `has_tut_lab: false`

2. **settings collection** — convert existing `{ type: "groups", data: { level_1, level_2, level_3, level_4 } }` to new `levels_config` shape with auto-generated group/subgroup structure using the count values.

3. **availability collection** — convert `slots: [{ day, slot }]` to `available_days: [day]` (deduplicate days from slots).

4. **schedules + schedule_snapshots** — for each entry:
   - Remove `room_id` ObjectId
   - Add `room_code: ""` (empty — old entries don't have room codes, mark as legacy)
   - Add `session_type: "lecture"` (assume lecture for old entries)
   - Add `subgroup: null`, `groups_covered: []`, `level: 0`, `course_code: ""`, `course_name: ""`

5. **rooms collection** — drop entirely after migration.

6. **schedule_jobs** — update validator to add missing status enum values and fix field names.

---

## 14. Critical Bug Fixes (must be done before or alongside)

From findings.md — these block the system from working:

- **BUG-001/002:** Rename `proxy.js` → `middleware.js`, rename `export async function proxy` → `export async function middleware`
- **BUG-003:** Fix `hashPassword` import in `app/api/auth/signin/route.js` (from `@/lib/password` not `@/lib/auth`)
- **BUG-004:** Fix `hashPassword` import in `app/api/coordinator/staff/route.js`
- **BUG-005:** Fix `new ObjectId(institutionId)` in `app/api/coordinator/import/route.js` → use `resolveInstitutionId()`
- **BUG-008:** Replace `.split(",")` CSV parsing in import route with `papaparse`
