# Schedula Next.js Solver & Schema Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the FastAPI solver with a pure Next.js 3-phase constraint solver, redesign the courses/groups/availability/schedule DB schemas, hardcode rooms, and fix critical auth bugs — all while keeping the existing UI shell intact.

**Architecture:** A 3-phase solver (AC-3 domain trimming → greedy backtracker with forward checking → simulated annealing post-processor) runs as a background async job. Courses store flat session-type flags + staff assignment. Groups/subgroups are configured per-institution with auto-generated ECU-style names. Rooms are a hardcoded constant.

**Tech Stack:** Next.js 16 App Router, MongoDB 7 (driver), papaparse (already installed), no new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `middleware.js` | CREATE (rename from proxy.js) | Auth middleware with correct export name |
| `proxy.js` | DELETE | Replaced by middleware.js |
| `lib/rooms.js` | CREATE | Hardcoded room constant + helpers |
| `lib/durations.js` | CREATE | Fixed session duration constants |
| `lib/solver/subgroups.js` | CREATE | Derive subgroup names from group_id + count |
| `lib/solver/expand.js` | CREATE | Expand courses into sessions (descending level order) |
| `lib/solver/domains.js` | CREATE | AC-3 domain trimming |
| `lib/solver/backtrack.js` | CREATE | Greedy MCV backtracker with forward checking |
| `lib/solver/cost.js` | CREATE | Soft constraint cost function |
| `lib/solver/anneal.js` | CREATE | Simulated annealing post-processor |
| `lib/solver/index.js` | CREATE | Orchestrate 3 phases, return result |
| `scripts/migrate-schema.mjs` | CREATE | One-time DB migration |
| `scripts/setup-db-v2.mjs` | CREATE | Updated DB setup with new validators |
| `app/api/coordinator/schedule/generate/route.js` | MODIFY | Replace FastAPI+fallback with lib/solver |
| `app/api/coordinator/courses/route.js` | MODIFY | New course shape |
| `app/api/coordinator/courses/[id]/route.js` | MODIFY | New course shape |
| `app/api/coordinator/groups/route.js` | MODIFY | New levels_config shape |
| `app/api/staff/availability/route.js` | MODIFY | available_days[] not slots[] |
| `app/api/coordinator/availability/status/route.js` | MODIFY | Read available_days[] |
| `app/coordinator/courses/page.js` | MODIFY | New form fields |
| `app/coordinator/groups/page.js` | MODIFY | New levels_config UI |
| `app/coordinator/schedule/published/page.js` | MODIFY | Grid view with level tabs |
| `lib/server/coordinatorService.js` | MODIFY | Remove room functions, update course functions |
| `app/api/coordinator/rooms/route.js` | DELETE | Rooms are hardcoded |
| `app/api/coordinator/rooms/[id]/route.js` | DELETE | Rooms are hardcoded |
| `app/coordinator/rooms/page.js` | DELETE | Rooms are hardcoded |
| `app/coordinator/rooms/styles.css` | DELETE | Rooms are hardcoded |
| `app/coordinator/layout.js` | MODIFY | Remove Rooms nav item, fix icons |

---

## Task 1: Fix Critical Auth Bugs (BUG-001 through BUG-005)

**Files:**
- Create: `middleware.js`
- Delete: `proxy.js`
- Modify: `app/api/auth/signin/route.js`
- Modify: `app/api/coordinator/staff/route.js`
- Modify: `app/api/coordinator/import/route.js`

- [ ] **Step 1: Create middleware.js from proxy.js**

Copy `proxy.js` to `middleware.js`, rename the exported function:

```js
// middleware.js  (full file — replaces proxy.js)
import { NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/edge-auth";

const PUBLIC_ROUTES = [
  "/",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/unauthorized",
  "/api/auth",
];

const PROTECTED_ROUTES = {
  "/coordinator": ["coordinator"],
  "/staff": ["professor", "ta"],
  "/student": ["student"],
  "/onboarding": ["coordinator", "professor", "ta", "student"],
};

function withRequestId(response) {
  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function getRequiredRoles(pathname) {
  for (const [route, roles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return roles;
    }
  }
  return null;
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    return withRequestId(NextResponse.next());
  }

  if (isPublicRoute(pathname)) {
    return withRequestId(NextResponse.next());
  }

  if (process.env.BYPASS_AUTH === "true") {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id",    process.env.BYPASS_AUTH_USER_ID    || "666666666666666666666601");
    requestHeaders.set("x-user-role",  process.env.BYPASS_AUTH_USER_ROLE  || "coordinator");
    requestHeaders.set("x-user-email", process.env.BYPASS_AUTH_USER_EMAIL || "coordinator@demo.local");
    requestHeaders.set("x-user-institution", process.env.BYPASS_AUTH_USER_INSTITUTION || "");
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const requiredRoles = getRequiredRoles(pathname);
  if (!requiredRoles) {
    return withRequestId(NextResponse.next());
  }

  const authToken = request.cookies.get("auth_token")?.value;

  if (!authToken) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("redirect", pathname);
    return withRequestId(NextResponse.redirect(url));
  }

  const payload = await verifyTokenEdge(authToken);

  if (!payload) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("redirect", pathname);
    return withRequestId(NextResponse.redirect(url));
  }

  if (!requiredRoles.includes(payload.role)) {
    const ROLE_HOME = {
      coordinator: "/coordinator/setup",
      professor:   "/staff/schedule",
      ta:          "/staff/schedule",
      student:     "/student/schedule",
    };
    const dest = ROLE_HOME[payload.role] ?? "/unauthorized";
    return withRequestId(NextResponse.redirect(new URL(dest, request.url)));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-institution", payload.institution ?? "");

  return withRequestId(
    NextResponse.next({ request: { headers: requestHeaders } }),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
```

- [ ] **Step 2: Delete proxy.js**

```bash
rm /Users/anas/Projects/sch/schedula/proxy.js
```

- [ ] **Step 3: Fix hashPassword import in signin route**

In `app/api/auth/signin/route.js`, change line 4:
```js
// BEFORE
import { comparePassword, hashPassword } from "@/lib/password";
import { generateToken } from "@/lib/auth";

// AFTER — hashPassword was already correctly in password, just ensure this:
import { comparePassword, hashPassword } from "@/lib/password";
import { generateToken } from "@/lib/auth";
```

Verify line 4–5 of `app/api/auth/signin/route.js` currently reads:
```js
import { signToken } from "@/lib/jwt";
import { comparePassword, hashPassword } from "@/lib/password";
```
If `hashPassword` is imported from `@/lib/auth` instead, change it to `@/lib/password`.

- [ ] **Step 4: Fix hashPassword import in staff route**

In `app/api/coordinator/staff/route.js` line 7, change:
```js
// BEFORE
import { generateToken, hashPassword } from "@/lib/auth";

// AFTER
import { generateToken } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
```

- [ ] **Step 5: Fix resolveInstitutionId in import route**

In `app/api/coordinator/import/route.js`, find line ~78:
```js
// BEFORE
const iOid = new ObjectId(institutionId);

// AFTER
const iOid = await resolveInstitutionId(institutionId);
```

Ensure `resolveInstitutionId` is imported at the top (it already exists in other routes):
```js
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
```

- [ ] **Step 6: Verify dev server starts without errors**

```bash
cd /Users/anas/Projects/sch/schedula && pnpm dev
```

Expected: server starts, no import errors in terminal.

- [ ] **Step 7: Commit**

```bash
git add middleware.js app/api/auth/signin/route.js app/api/coordinator/staff/route.js app/api/coordinator/import/route.js
git rm proxy.js
git commit -m "fix: rename proxy to middleware, fix hashPassword imports, fix resolveInstitutionId in import"
```

---

## Task 2: Hardcode Rooms + Remove Room Management

**Files:**
- Create: `lib/rooms.js`
- Create: `lib/durations.js`
- Delete: `app/api/coordinator/rooms/route.js`
- Delete: `app/api/coordinator/rooms/[id]/route.js`
- Delete: `app/coordinator/rooms/page.js`
- Delete: `app/coordinator/rooms/styles.css`
- Modify: `app/coordinator/layout.js`
- Modify: `lib/server/coordinatorService.js`

- [ ] **Step 1: Create lib/rooms.js**

```js
// lib/rooms.js
export const ROOMS = [
  { code: "A202", wing: "A", type: "LECTURE_HALL" },
  { code: "A207", wing: "A", type: "LECTURE_HALL" },
  { code: "A302", wing: "A", type: "LECTURE_HALL" },
  { code: "A307", wing: "A", type: "LECTURE_HALL" },
  { code: "A308", wing: "A", type: "LECTURE_HALL" },
  { code: "A312", wing: "A", type: "LECTURE_HALL" },
  { code: "E-4",  wing: "E", type: "LECTURE_HALL" },
  { code: "A203", wing: "A", type: "LAB" },
  { code: "A206", wing: "A", type: "LAB" },
  { code: "A303", wing: "A", type: "LAB" },
  { code: "A310", wing: "A", type: "LAB" },
  { code: "A311", wing: "A", type: "LAB" },
  { code: "A313", wing: "A", type: "LAB" },
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
  { code: "C107", wing: "C", type: "LAB" },
  { code: "C120", wing: "C", type: "LAB" },
  { code: "C205", wing: "C", type: "LAB" },
  { code: "C207", wing: "C", type: "LAB" },
  { code: "E102", wing: "E", type: "LAB" },
  { code: "E103", wing: "E", type: "LAB" },
  { code: "E106", wing: "E", type: "LAB" },
];

export const ROOM_BY_CODE = Object.fromEntries(ROOMS.map(r => [r.code, r]));
export const LECTURE_HALLS  = ROOMS.filter(r => r.type === "LECTURE_HALL");
export const TUTORIAL_ROOMS = ROOMS.filter(r => r.type === "TUTORIAL");
export const LAB_ROOMS      = ROOMS.filter(r => r.type === "LAB");
```

- [ ] **Step 2: Create lib/durations.js**

```js
// lib/durations.js
export const DURATIONS = {
  lecture:  120,
  tutorial: 120,
  lab:       60,
};
```

- [ ] **Step 3: Remove room API routes and pages**

```bash
rm app/api/coordinator/rooms/route.js
rm app/api/coordinator/rooms/[id]/route.js
rm app/coordinator/rooms/page.js
rm app/coordinator/rooms/styles.css
```

- [ ] **Step 4: Remove room functions from coordinatorService.js**

In `lib/server/coordinatorService.js`, remove the following exported functions entirely:
- `getCoordinatorRooms`
- `createRoom`
- `updateRoom`
- `deleteRoom`

- [ ] **Step 5: Remove Rooms nav item from coordinator layout, fix icons**

In `app/coordinator/layout.js`, update `NAV_ITEMS`:

```js
// Remove the rooms entry and fix duplicate icons
const NAV_ITEMS = [
  { href: "/coordinator/setup",              label: "Setup",       Icon: HomeIcon          },
  { href: "/coordinator/courses",            label: "Courses",     Icon: BookOpenIcon      },
  { href: "/coordinator/staff",              label: "Staff",       Icon: UserIcon          },
  { href: "/coordinator/groups",             label: "Groups",      Icon: GraduationCapIcon },
  { href: "/coordinator/constraints",        label: "Constraints", Icon: SettingsIcon      },
  { href: "/coordinator/assign",             label: "Assign",      Icon: CalendarIcon      },
  { href: "/coordinator/schedule/generate",  label: "Generate",    Icon: RocketIcon        },
  { href: "/coordinator/schedule/review",    label: "Review",      Icon: GearIcon          },
  { href: "/coordinator/schedule/published", label: "Published",   Icon: CalendarIcon      },
  { href: "/coordinator/analytics",          label: "Analytics",   Icon: BoltIcon          },
  { href: "/coordinator/import",             label: "Import",      Icon: DownloadIcon      },
  { href: "/coordinator/users",              label: "Users",       Icon: UserIcon          },
  { href: "/coordinator/settings",           label: "Settings",    Icon: SettingsIcon      },
];
```

Add `RocketIcon` to the import line:
```js
import {
  BookOpenIcon, HomeIcon, UserIcon, CalendarIcon,
  BoltIcon, GearIcon, SettingsIcon, GraduationCapIcon,
  DownloadIcon, RocketIcon,
} from "@/components/icons/index";
```

Check `components/icons/index.js` — if `RocketIcon` is not exported yet, add it:
```js
// In components/icons/index.js, add:
export { default as RocketIcon } from "./Rocket";
```

- [ ] **Step 6: Commit**

```bash
git add lib/rooms.js lib/durations.js lib/server/coordinatorService.js app/coordinator/layout.js components/icons/index.js
git rm app/api/coordinator/rooms/route.js app/api/coordinator/rooms/[id]/route.js app/coordinator/rooms/page.js app/coordinator/rooms/styles.css
git commit -m "feat: hardcode rooms constant, remove room management UI and API"
```

---

## Task 3: Redesign Courses Schema (API + Migration)

**Files:**
- Create: `scripts/migrate-schema.mjs`
- Modify: `app/api/coordinator/courses/route.js`
- Modify: `app/api/coordinator/courses/[id]/route.js`
- Modify: `lib/server/coordinatorService.js`

- [ ] **Step 1: Create migration script**

```js
// scripts/migrate-schema.mjs
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB ?? "schedula";

const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } });

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);

  // ── 1. Migrate courses ──────────────────────────────────────────────────────
  console.log("Migrating courses...");
  const courses = await db.collection("courses").find({}).toArray();
  let migrated = 0;

  for (const course of courses) {
    const sections = course.sections ?? [];
    const types = sections.map(s => s.type ?? "lecture");

    const has_lecture  = types.includes("lecture");
    const has_lab      = types.includes("lab");
    const has_tutorial = types.includes("tutorial");
    const has_tut_lab  = false;

    // Extract level from first section's year_levels, fallback to existing top-level field
    const level = course.level
      ?? sections[0]?.year_levels?.[0]
      ?? 1;

    await db.collection("courses").updateOne(
      { _id: course._id },
      {
        $set: {
          level,
          has_lecture,
          has_tutorial,
          has_lab,
          has_tut_lab,
          groups_per_lecture: 1,
          professor_id: null,
          ta_ids: [],
        },
        $unset: { sections: "" },
      }
    );
    migrated++;
  }
  console.log(`  ✅ ${migrated} courses migrated`);

  // ── 2. Migrate availability ─────────────────────────────────────────────────
  console.log("Migrating availability...");
  const avail = await db.collection("availability").find({}).toArray();
  let availMigrated = 0;

  for (const doc of avail) {
    if (Array.isArray(doc.slots)) {
      const available_days = [...new Set(doc.slots.map(s => s.day).filter(Boolean))];
      await db.collection("availability").updateOne(
        { _id: doc._id },
        {
          $set: { available_days },
          $unset: { slots: "", day_off: "", preferred_break: "" },
        }
      );
      availMigrated++;
    }
  }
  console.log(`  ✅ ${availMigrated} availability docs migrated`);

  // ── 3. Migrate settings groups → levels_config ──────────────────────────────
  console.log("Migrating groups settings...");
  const groupSettings = await db.collection("settings").findOne({ type: "groups" });
  if (groupSettings) {
    const d = groupSettings.data ?? {};
    const levels = [];

    if (d.level_1 > 0) {
      const groups = [];
      for (let g = 1; g <= d.level_1; g++) {
        groups.push({ group_id: `G${g}`, subgroup_count: 3 });
      }
      levels.push({ level: 1, label: "Level 1", groups });
    }
    if (d.level_2 > 0) {
      const groups = [];
      for (let g = 1; g <= d.level_2; g++) {
        groups.push({ group_id: `G${g}`, subgroup_count: 3 });
      }
      levels.push({ level: 2, label: "Level 2", groups });
    }
    if (d.level_3 > 0) {
      const groups = [];
      for (let g = 1; g <= d.level_3; g++) {
        groups.push({ group_id: `G${g}`, subgroup_count: g === 2 ? 2 : 3 });
      }
      levels.push({ level: 3, label: "Level 3", groups });
    }
    if (d.level_4 > 0) {
      levels.push({ level: 4, label: "Level 4", groups: [{ group_id: "G1", subgroup_count: 0 }] });
    }

    await db.collection("settings").updateOne(
      { _id: groupSettings._id },
      {
        $set: {
          type: "levels_config",
          data: { levels },
          updated_at: new Date(),
        }
      }
    );
    console.log("  ✅ groups settings migrated to levels_config");
  } else {
    console.log("  ℹ️  No groups settings found — skipping");
  }

  // ── 4. Migrate schedule entries ─────────────────────────────────────────────
  console.log("Migrating schedule entries...");
  const schedules = await db.collection("schedules").find({}).toArray();
  for (const sched of schedules) {
    const newEntries = (sched.entries ?? []).map(e => ({
      ...e,
      room_code:      "",
      session_type:   "lecture",
      level:          0,
      subgroup:       null,
      groups_covered: [],
      course_code:    "",
      course_name:    "",
    }));
    await db.collection("schedules").updateOne(
      { _id: sched._id },
      { $set: { entries: newEntries } }
    );
  }
  console.log(`  ✅ ${schedules.length} schedules entries enriched`);

  // ── 5. Drop rooms collection ─────────────────────────────────────────────────
  console.log("Dropping rooms collection...");
  try {
    await db.collection("rooms").drop();
    console.log("  ✅ rooms collection dropped");
  } catch {
    console.log("  ℹ️  rooms collection already gone");
  }

  console.log("\n🎉 Migration complete.");
}

main().catch(err => { console.error(err); process.exit(1); }).finally(() => client.close());
```

- [ ] **Step 2: Add migrate script to package.json**

In `package.json`, add to `"scripts"`:
```json
"db:migrate": "node --env-file=.env scripts/migrate-schema.mjs"
```

- [ ] **Step 3: Update courses POST route**

Replace `app/api/coordinator/courses/route.js` POST handler body with:

```js
export async function POST(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const body = await request.json();
    const {
      code, name, credit_hours, level,
      has_lecture, has_tutorial, has_lab, has_tut_lab,
      groups_per_lecture, professor_id, ta_ids,
    } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ message: "Course code and name are required." }, { status: 400 });
    }
    if (!Number.isInteger(level) || level < 0) {
      return NextResponse.json({ message: "Valid level is required." }, { status: 400 });
    }
    if (!has_lecture && !has_tutorial && !has_lab && !has_tut_lab) {
      return NextResponse.json({ message: "At least one session type is required." }, { status: 400 });
    }

    const iOid = await resolveInstitutionId(institutionId);
    const db   = await getDb();

    const doc = {
      institution_id:     iOid,
      code:               code.trim().toUpperCase(),
      name:               name.trim(),
      credit_hours:       parseInt(credit_hours) || 3,
      level:              parseInt(level),
      has_lecture:        Boolean(has_lecture),
      has_tutorial:       Boolean(has_tutorial),
      has_lab:            Boolean(has_lab),
      has_tut_lab:        Boolean(has_tut_lab),
      groups_per_lecture: Math.max(1, parseInt(groups_per_lecture) || 1),
      professor_id:       professor_id && ObjectId.isValid(professor_id) ? new ObjectId(professor_id) : null,
      ta_ids:             Array.isArray(ta_ids) ? ta_ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) : [],
      created_at:         new Date(),
      deleted_at:         null,
    };

    const result = await db.collection("courses").insertOne(doc);
    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
```

Add missing imports at top of file:
```js
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
```

- [ ] **Step 4: Update courses PUT route**

Replace `app/api/coordinator/courses/[id]/route.js` with:

```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid course ID." }, { status: 400 });
    }

    const body = await request.json();
    const {
      code, name, credit_hours, level,
      has_lecture, has_tutorial, has_lab, has_tut_lab,
      groups_per_lecture, professor_id, ta_ids,
    } = body;

    const iOid = await resolveInstitutionId(institutionId);
    const db   = await getDb();

    const $set = { updated_at: new Date() };
    if (code !== undefined)               $set.code               = code.trim().toUpperCase();
    if (name !== undefined)               $set.name               = name.trim();
    if (credit_hours !== undefined)       $set.credit_hours       = parseInt(credit_hours) || 3;
    if (level !== undefined)              $set.level              = parseInt(level);
    if (has_lecture !== undefined)        $set.has_lecture        = Boolean(has_lecture);
    if (has_tutorial !== undefined)       $set.has_tutorial       = Boolean(has_tutorial);
    if (has_lab !== undefined)            $set.has_lab            = Boolean(has_lab);
    if (has_tut_lab !== undefined)        $set.has_tut_lab        = Boolean(has_tut_lab);
    if (groups_per_lecture !== undefined) $set.groups_per_lecture = Math.max(1, parseInt(groups_per_lecture) || 1);
    if (professor_id !== undefined)       $set.professor_id       = professor_id && ObjectId.isValid(professor_id) ? new ObjectId(professor_id) : null;
    if (ta_ids !== undefined)             $set.ta_ids             = Array.isArray(ta_ids) ? ta_ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) : [];

    const result = await db.collection("courses").updateOne(
      { _id: new ObjectId(id), institution_id: iOid, deleted_at: null },
      { $set }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid course ID." }, { status: 400 });
    }

    const iOid = await resolveInstitutionId(institutionId);
    const db   = await getDb();

    const result = await db.collection("courses").updateOne(
      { _id: new ObjectId(id), institution_id: iOid },
      { $set: { deleted_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
```

- [ ] **Step 5: Update getCoordinatorCourses in coordinatorService.js**

Replace the `getCoordinatorCourses` return mapping to use new shape:

```js
return {
  items: courses.map((c) => ({
    id:                 c._id.toString(),
    code:               c.code,
    name:               c.name,
    credit_hours:       c.credit_hours,
    level:              c.level ?? 1,
    has_lecture:        c.has_lecture  ?? false,
    has_tutorial:       c.has_tutorial ?? false,
    has_lab:            c.has_lab      ?? false,
    has_tut_lab:        c.has_tut_lab  ?? false,
    groups_per_lecture: c.groups_per_lecture ?? 1,
    professor_id:       c.professor_id?.toString() ?? null,
    ta_ids:             (c.ta_ids ?? []).map(id => id.toString()),
    createdAt:          c.created_at?.toISOString(),
  })),
  total: count,
  skip,
  limit,
};
```

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-schema.mjs package.json app/api/coordinator/courses/route.js app/api/coordinator/courses/[id]/route.js lib/server/coordinatorService.js
git commit -m "feat: redesign courses schema — level, session flags, professor_id, ta_ids; add migration script"
```

---

## Task 4: Redesign Groups API (levels_config)

**Files:**
- Modify: `app/api/coordinator/groups/route.js`

- [ ] **Step 1: Replace groups GET+PUT with levels_config shape**

Replace `app/api/coordinator/groups/route.js` entirely:

```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";

// ── GET /api/coordinator/groups ──────────────────────────────────────────────
export async function GET(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const db   = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    const settings = await db.collection("settings").findOne({
      institution_id: iOid,
      type: "levels_config",
    });

    const levels = settings?.data?.levels ?? [];
    return NextResponse.json({ levels });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── PUT /api/coordinator/groups ──────────────────────────────────────────────
// Body: { levels: [{ level, label, groups: [{ group_id, subgroup_count }] }] }
export async function PUT(request) {
  try {
    const { institutionId } = getCurrentUser(request, { requiredRole: "coordinator" });
    const body = await request.json();
    const { levels } = body;

    if (!Array.isArray(levels) || levels.length === 0) {
      return NextResponse.json({ message: "levels array is required." }, { status: 400 });
    }

    for (const lv of levels) {
      if (!Number.isInteger(lv.level) || lv.level < 0) {
        return NextResponse.json({ message: `Invalid level number: ${lv.level}` }, { status: 400 });
      }
      if (!Array.isArray(lv.groups)) {
        return NextResponse.json({ message: `Level ${lv.level} must have a groups array.` }, { status: 400 });
      }
      for (const g of lv.groups) {
        if (!g.group_id || typeof g.group_id !== "string") {
          return NextResponse.json({ message: "Each group must have a group_id string." }, { status: 400 });
        }
        if (!Number.isInteger(g.subgroup_count) || g.subgroup_count < 0) {
          return NextResponse.json({ message: `Invalid subgroup_count for group ${g.group_id}` }, { status: 400 });
        }
      }
    }

    const db   = await getDb();
    const iOid = await resolveInstitutionId(institutionId);

    await db.collection("settings").updateOne(
      { institution_id: iOid, type: "levels_config" },
      {
        $set: {
          institution_id: iOid,
          type: "levels_config",
          data: { levels },
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, levels });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/coordinator/groups/route.js
git commit -m "feat: redesign groups API to levels_config with per-group subgroup counts"
```

---

## Task 5: Redesign Availability API (days only)

**Files:**
- Modify: `app/api/staff/availability/route.js`
- Modify: `app/api/coordinator/availability/status/route.js`

- [ ] **Step 1: Replace availability route**

Replace `app/api/staff/availability/route.js` entirely:

```js
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/server/auth";

const VALID_DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];

export async function GET(request) {
  try {
    const { userId } = getCurrentUser(request);
    const db = await getDb();

    const user = await db.collection("users").findOne({
      _id:  new ObjectId(userId),
      role: { $in: ["professor", "ta"] },
    });

    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const institution = await db.collection("institutions").findOne({ _id: user.institution_id });
    const termLabel   = institution?.active_term?.label ?? "Spring 2026";
    const workingDays = institution?.active_term?.working_days ?? VALID_DAYS;

    const existing = await db.collection("availability").findOne({
      user_id:    user._id,
      term_label: termLabel,
    });

    return NextResponse.json({
      staff:          { name: user.name, role: user.role, email: user.email },
      term:           termLabel,
      working_days:   workingDays,
      available_days: existing?.available_days ?? [],
      submitted:      !!existing,
    });

  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = getCurrentUser(request, { requiredRole: ["professor", "ta"] });
    const body = await request.json();
    const { available_days } = body;

    if (!Array.isArray(available_days)) {
      return NextResponse.json({ error: "available_days must be an array" }, { status: 400 });
    }

    const db   = await getDb();
    const user = await db.collection("users").findOne({
      _id:  new ObjectId(userId),
      role: { $in: ["professor", "ta"] },
    });

    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const institution = await db.collection("institutions").findOne({ _id: user.institution_id });
    const termLabel   = institution?.active_term?.label ?? "Spring 2026";
    const workingDays = institution?.active_term?.working_days ?? VALID_DAYS;

    const cleanDays = available_days.filter(d => workingDays.includes(d));

    await db.collection("availability").updateOne(
      { user_id: user._id, institution_id: user.institution_id, term_label: termLabel },
      {
        $set: {
          user_id:        user._id,
          institution_id: user.institution_id,
          term_label:     termLabel,
          available_days: cleanDays,
          submitted_at:   new Date(),
          updated_at:     new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, term: termLabel, available_days: cleanDays });

  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update availability status route**

In `app/api/coordinator/availability/status/route.js`, change the enriched mapping:

```js
// Replace slotCount and slots fields:
const enriched = staff.map(s => {
  const sub = submissionMap[s._id.toString()];
  return {
    id:             s._id.toString(),
    name:           s.name,
    email:          s.email,
    role:           s.role,
    status:         sub ? "submitted" : "missing",
    available_days: sub?.available_days ?? [],
    submittedAt:    sub?.submitted_at ?? null,
  };
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/staff/availability/route.js app/api/coordinator/availability/status/route.js
git commit -m "feat: simplify availability to available_days array (day-level only)"
```

---

## Task 6: Solver — Subgroup Utilities + Session Expansion

**Files:**
- Create: `lib/solver/subgroups.js`
- Create: `lib/solver/expand.js`

- [ ] **Step 1: Create subgroups.js**

```js
// lib/solver/subgroups.js

/**
 * Derive subgroup name list from group_id and subgroup_count.
 * group_id="G1", count=3  → ["G1-1","G1-2","G1-3"]
 * group_id="GA", count=12 → ["GA-1","GA-2",...,"GA-12"]
 * count=0 → [] (no subgroups — group is its own unit e.g. L4)
 */
export function deriveSubgroups(groupId, subgroupCount) {
  if (subgroupCount === 0) return [];
  return Array.from({ length: subgroupCount }, (_, i) => `${groupId}-${i + 1}`);
}

/**
 * Build a full groups map from the levels_config data entry.
 * Returns: Map<level, { label, groups: [{ group_id, subgroups: string[] }] }>
 */
export function buildLevelMap(levelsConfig) {
  const map = new Map();
  for (const lv of levelsConfig) {
    map.set(lv.level, {
      label:  lv.label,
      groups: lv.groups.map(g => ({
        group_id:  g.group_id,
        subgroups: deriveSubgroups(g.group_id, g.subgroup_count),
      })),
    });
  }
  return map;
}

/**
 * Get all subgroups for a level (flat array).
 * Returns: [{ group_id, subgroup }]  — subgroup is null if group has no subgroups
 */
export function allSubgroupsForLevel(levelEntry) {
  const result = [];
  for (const g of levelEntry.groups) {
    if (g.subgroups.length === 0) {
      result.push({ group_id: g.group_id, subgroup: null });
    } else {
      for (const sg of g.subgroups) {
        result.push({ group_id: g.group_id, subgroup: sg });
      }
    }
  }
  return result;
}
```

- [ ] **Step 2: Create expand.js**

```js
// lib/solver/expand.js
import { allSubgroupsForLevel } from "./subgroups.js";

/**
 * Expand a course into individual sessions.
 * Returns an array of session objects ready for the solver.
 *
 * @param {object} course - course document from DB (new schema)
 * @param {object} levelEntry - { label, groups: [{ group_id, subgroups }] }
 * @returns {Session[]}
 */
export function expandCourse(course, levelEntry) {
  const sessions = [];
  const allGroups = levelEntry.groups;

  // ── Lectures ────────────────────────────────────────────────────────────────
  if (course.has_lecture) {
    const gpl = Math.max(1, course.groups_per_lecture ?? 1);
    // Batch groups: e.g. 3 groups + gpl=2 → [G1,G2] and [G3]
    for (let i = 0; i < allGroups.length; i += gpl) {
      const batch = allGroups.slice(i, i + gpl);
      sessions.push({
        id:             `${course._id}-lec-batch${i}`,
        course_id:      course._id,
        course_code:    course.code,
        course_name:    course.name,
        level:          course.level,
        session_type:   "lecture",
        staff_id:       course.professor_id,
        groups_covered: batch.map(g => g.group_id),
        subgroup:       null,
        duration:       120,
      });
    }
  }

  // ── Tutorial + Lab (per subgroup) ───────────────────────────────────────────
  const subgroupUnits = allSubgroupsForLevel(levelEntry);

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

  if (course.has_tut_lab) {
    for (const { group_id, subgroup } of subgroupUnits) {
      const key = subgroup ?? group_id;
      // Two linked sessions: tut then lab
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
        linked_lab_id:  `${course._id}-tutlab-lab-${key}`,
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
        linked_tut_id:  `${course._id}-tutlab-tut-${key}`,
      });
    }
  }

  return sessions;
}

/**
 * Expand ALL courses for ALL levels, in descending level order (L4 first).
 * @param {object[]} courses - all course docs
 * @param {Map} levelMap - from buildLevelMap()
 * @returns {Session[]} - flat array of all sessions, sorted descending by level
 */
export function expandAll(courses, levelMap) {
  const levels = [...levelMap.keys()].sort((a, b) => b - a); // descending: 4,3,2,1,0
  const sessions = [];

  for (const level of levels) {
    const levelEntry = levelMap.get(level);
    const levelCourses = courses.filter(c => c.level === level && !c.deleted_at);
    for (const course of levelCourses) {
      sessions.push(...expandCourse(course, levelEntry));
    }
  }

  return sessions;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/solver/subgroups.js lib/solver/expand.js
git commit -m "feat: solver utils — subgroup derivation and course-to-session expansion"
```

---

## Task 7: Solver — Domain Trimming (AC-3)

**Files:**
- Create: `lib/solver/domains.js`

- [ ] **Step 1: Create domains.js**

```js
// lib/solver/domains.js
import { LECTURE_HALLS, TUTORIAL_ROOMS, LAB_ROOMS } from "../rooms.js";

/**
 * Build time grid from institution settings.
 * Returns: [{ period, day, start, end }] — all valid (day, period) combos
 */
export function buildTimeGrid(institution) {
  const workingDays    = institution.active_term?.working_days ?? ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
  const numPeriods     = institution.settings?.num_periods ?? 10;
  const dailyStartHour = parseInt((institution.settings?.daily_start ?? "08:30").split(":")[0]);
  const dailyStartMin  = parseInt((institution.settings?.daily_start ?? "08:30").split(":")[1]);
  const periodDuration = institution.settings?.slot_duration_minutes ?? 60;

  const slots = [];
  for (const day of workingDays) {
    for (let p = 1; p <= numPeriods; p++) {
      const startMins = dailyStartMin + (p - 1) * periodDuration;
      const endMins   = startMins + periodDuration;
      const startH    = dailyStartHour + Math.floor(startMins / 60);
      const startM    = startMins % 60;
      const endH      = dailyStartHour + Math.floor(endMins / 60);
      const endM      = endMins % 60;
      slots.push({
        period: p,
        day,
        start: `${String(startH).padStart(2,"0")}:${String(startM).padStart(2,"0")}`,
        end:   `${String(endH).padStart(2,"0")}:${String(endM).padStart(2,"0")}`,
      });
    }
  }
  return slots;
}

/**
 * Get rooms valid for a session type.
 */
function roomsForType(sessionType) {
  if (sessionType === "lecture") return LECTURE_HALLS;
  if (sessionType === "tutorial") return TUTORIAL_ROOMS;
  return LAB_ROOMS; // lab + tut_lab
}

/**
 * Compute the initial domain for a session:
 * domain = [{ day, period, start, end, room_code }]
 *
 * Trims:
 * - Days where instructor is not available (HC-10)
 * - Periods that would exceed num_periods (HC-8)
 * - Slot+duration combos that spill past daily_end
 */
export function computeDomain(session, timeGrid, availabilityMap, institution) {
  const availDays     = availabilityMap.get(session.staff_id?.toString()) ?? [];
  const periodDurMins = institution.settings?.slot_duration_minutes ?? 60;
  const numPeriods    = institution.settings?.num_periods ?? 10;

  // How many consecutive periods does this session need?
  const periodsNeeded = Math.ceil(session.duration / periodDurMins);

  const rooms = roomsForType(session.session_type);
  const domain = [];

  for (const slot of timeGrid) {
    // HC-10: instructor must be available on this day
    if (session.staff_id && availDays.length > 0 && !availDays.includes(slot.day)) continue;

    // HC-8: session must fit within the period grid
    if (slot.period + periodsNeeded - 1 > numPeriods) continue;

    for (const room of rooms) {
      domain.push({
        day:       slot.day,
        period:    slot.period,
        start:     slot.start,
        end:       slot.end,
        room_code: room.code,
      });
    }
  }

  return domain;
}

/**
 * Build domains for all sessions.
 * Returns Map<sessionId, domain[]>
 * Throws infeasibility error if any session has empty domain.
 */
export function buildDomains(sessions, timeGrid, availabilityMap, institution) {
  const domains = new Map();
  const infeasible = [];

  for (const session of sessions) {
    const domain = computeDomain(session, timeGrid, availabilityMap, institution);
    if (domain.length === 0) {
      infeasible.push({
        session_id:   session.id,
        course_code:  session.course_code,
        session_type: session.session_type,
        subgroup:     session.subgroup,
        reason:       "No valid (day, period, room) slot after domain trimming",
      });
    }
    domains.set(session.id, domain);
  }

  return { domains, infeasible };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/solver/domains.js
git commit -m "feat: solver domain trimming (AC-3) with time grid builder"
```

---

## Task 8: Solver — Backtracker + Cost Function

**Files:**
- Create: `lib/solver/cost.js`
- Create: `lib/solver/backtrack.js`

- [ ] **Step 1: Create cost.js**

```js
// lib/solver/cost.js

/**
 * Compute the soft constraint cost of the current partial/full assignment.
 * Lower = better.
 *
 * Weights:
 *  w1=4 — distinct days a subgroup attends (minimize campus days)
 *  w2=3 — total idle gap minutes per subgroup per day (minimize waiting)
 *  w3=1 — other soft violations (lecture before tutorial in week, etc.)
 */
export function computeCost(assignment) {
  // assignment: Map<sessionId, { day, period, start, end, room_code }>
  // We need to group by subgroup+day to compute gaps

  // Build: subgroupDays[subgroup][day] = sorted list of periods
  const subgroupDays = {};
  for (const [, slot] of assignment) {
    const key = slot.subgroup ?? slot.groups_covered?.[0] ?? "unknown";
    if (!subgroupDays[key]) subgroupDays[key] = {};
    if (!subgroupDays[key][slot.day]) subgroupDays[key][slot.day] = [];
    subgroupDays[key][slot.day].push(slot.period);
  }

  let cost = 0;

  for (const [, days] of Object.entries(subgroupDays)) {
    // w1: distinct days
    cost += 4 * Object.keys(days).length;

    // w2: idle gaps (gaps between consecutive sessions on the same day)
    for (const [, periods] of Object.entries(days)) {
      const sorted = [...periods].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1] - 1;
        if (gap > 0) cost += 3 * gap;
      }
    }
  }

  return cost;
}

/**
 * Score a candidate slot for a session given current assignment.
 * Lower = prefer to assign this slot first.
 */
export function scoreCandidate(session, candidate, assignment) {
  let score = 0;

  // Prefer days where this subgroup/group already has sessions (packing)
  const key = session.subgroup ?? session.groups_covered?.[0] ?? "unknown";
  let alreadyOnDay = false;
  for (const [, slot] of assignment) {
    const slotKey = slot.subgroup ?? slot.groups_covered?.[0];
    if (slotKey === key && slot.day === candidate.day) {
      alreadyOnDay = true;
      break;
    }
  }
  if (!alreadyOnDay) score += 10; // penalty for adding a new campus day

  return score;
}
```

- [ ] **Step 2: Create backtrack.js**

```js
// lib/solver/backtrack.js
import { scoreCandidate } from "./cost.js";

/**
 * Check hard constraints for a tentative assignment.
 * Returns true if valid, false if any HC is violated.
 */
function isValid(session, candidate, assignment, sessions) {
  for (const [assignedId, slot] of assignment) {
    if (slot.day !== candidate.day || slot.period !== candidate.period) continue;

    // HC-1: room conflict
    if (slot.room_code === candidate.room_code) return false;

    // Find the session for this assignment
    const other = sessions.find(s => s.id === assignedId);
    if (!other) continue;

    // HC-2: instructor conflict
    if (session.staff_id && other.staff_id &&
        session.staff_id.toString() === other.staff_id.toString()) return false;

    // HC-3: group lecture conflict (two lectures for same group at same time)
    if (session.session_type === "lecture" && other.session_type === "lecture") {
      const overlap = session.groups_covered.some(g => other.groups_covered.includes(g));
      if (overlap) return false;
    }

    // HC-4: subgroup conflict
    if (session.subgroup && other.subgroup && session.subgroup === other.subgroup) return false;

    // HC-4: subgroup vs lecture conflict (subgroup is in the lecture's groups)
    if (session.subgroup && other.session_type === "lecture") {
      const groupOfSubgroup = session.subgroup.replace(/-\d+$/, "");
      if (other.groups_covered.includes(groupOfSubgroup)) return false;
    }
    if (other.subgroup && session.session_type === "lecture") {
      const groupOfOther = other.subgroup.replace(/-\d+$/, "");
      if (session.groups_covered.includes(groupOfOther)) return false;
    }
  }

  return true;
}

/**
 * Forward check: after assigning session, check that all remaining
 * unassigned sessions still have at least one valid slot.
 */
function forwardCheck(justAssigned, candidate, remainingSessions, domains, assignment, sessions) {
  for (const session of remainingSessions) {
    const domain = domains.get(session.id);
    const stillValid = domain.some(slot =>
      isValid(session, slot, assignment, sessions)
    );
    if (!stillValid) return false;
  }
  return true;
}

/**
 * Sort sessions by domain size ascending (MCV heuristic — most constrained first).
 * Lectures before tutorials before labs within same domain size.
 */
function sortByMCV(sessions, domains) {
  const typeOrder = { lecture: 0, tutorial: 1, lab: 2, tut_lab: 3 };
  return [...sessions].sort((a, b) => {
    const da = domains.get(a.id)?.length ?? 0;
    const db = domains.get(b.id)?.length ?? 0;
    if (da !== db) return da - db;
    return (typeOrder[a.session_type] ?? 3) - (typeOrder[b.session_type] ?? 3);
  });
}

/**
 * Main backtracking solver.
 *
 * @param {Session[]} sessions
 * @param {Map} domains - sessionId → [{ day, period, start, end, room_code }]
 * @param {number} maxBacktracks
 * @returns {{ assignment: Map, backtracks: number, success: boolean }}
 */
export function backtrack(sessions, domains, maxBacktracks = 2000) {
  const assignment = new Map(); // sessionId → { day, period, start, end, room_code, subgroup, groups_covered }
  let backtracks = 0;

  const sorted = sortByMCV(sessions, domains);

  function assign(idx) {
    if (idx === sorted.length) return true;

    const session = sorted[idx];
    const domain  = domains.get(session.id) ?? [];

    // Score candidates — prefer ones that pack days
    const scored = domain
      .filter(slot => isValid(session, slot, assignment, sessions))
      .map(slot => ({ slot, score: scoreCandidate(session, slot, assignment) }))
      .sort((a, b) => a.score - b.score);

    for (const { slot } of scored) {
      if (backtracks > maxBacktracks) return false;

      assignment.set(session.id, {
        ...slot,
        subgroup:       session.subgroup,
        groups_covered: session.groups_covered,
        session_type:   session.session_type,
        course_id:      session.course_id,
        course_code:    session.course_code,
        course_name:    session.course_name,
        level:          session.level,
        staff_id:       session.staff_id,
        duration:       session.duration,
      });

      const remaining = sorted.slice(idx + 1);
      if (forwardCheck(session, slot, remaining, domains, assignment, sessions)) {
        if (assign(idx + 1)) return true;
      }

      assignment.delete(session.id);
      backtracks++;
    }

    return false;
  }

  const success = assign(0);
  return { assignment, backtracks, success };
}

/**
 * Run backtracker with restarts on failure.
 * Returns best result across all restarts.
 */
export function solveWithRestarts(sessions, domains, maxRestarts = 5, maxBacktracks = 2000) {
  let best = null;

  for (let r = 0; r < maxRestarts; r++) {
    // Shuffle sessions order slightly for diversity on restarts
    const shuffled = r === 0 ? sessions : [...sessions].sort(() => Math.random() - 0.5);

    // Re-sort by MCV with shuffled base
    const result = backtrack(shuffled, domains, maxBacktracks);

    if (result.success) return { ...result, restarts: r };

    if (!best || result.assignment.size > best.assignment.size) {
      best = { ...result, restarts: r };
    }
  }

  return { ...best, success: false };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/solver/cost.js lib/solver/backtrack.js
git commit -m "feat: solver backtracker with MCV ordering, forward checking, restarts"
```

---

## Task 9: Solver — Simulated Annealing Post-Processor

**Files:**
- Create: `lib/solver/anneal.js`

- [ ] **Step 1: Create anneal.js**

```js
// lib/solver/anneal.js
import { computeCost } from "./cost.js";

/**
 * Simulated annealing post-processor.
 * Improves soft constraint score (minimize campus days + idle gaps) while
 * keeping all hard constraints satisfied.
 *
 * @param {Map} assignment - from backtracker
 * @param {Session[]} sessions
 * @param {Map} domains - sessionId → valid slots
 * @param {number} budgetMs - time budget in milliseconds
 * @returns {Map} improved assignment
 */
export function anneal(assignment, sessions, domains, budgetMs = 800) {
  const start = Date.now();
  let current = new Map(assignment);
  let currentCost = computeCost(current);
  let best = new Map(current);
  let bestCost = currentCost;

  let temperature = 1.0;
  const coolingRate = 0.995;
  const sessionIds = [...assignment.keys()];

  while (Date.now() - start < budgetMs) {
    // Pick two random sessions and try swapping their slots
    const idxA = Math.floor(Math.random() * sessionIds.length);
    const idxB = Math.floor(Math.random() * sessionIds.length);
    if (idxA === idxB) continue;

    const idA = sessionIds[idxA];
    const idB = sessionIds[idxB];
    const slotA = current.get(idA);
    const slotB = current.get(idB);

    if (!slotA || !slotB) continue;

    // Sessions must be same type to swap rooms/slots meaningfully
    if (slotA.session_type !== slotB.session_type) continue;

    // Check slot is in each other's domain
    const domainA = domains.get(idA) ?? [];
    const domainB = domains.get(idB) ?? [];
    const aCanTakeB = domainA.some(s => s.day === slotB.day && s.period === slotB.period && s.room_code === slotB.room_code);
    const bCanTakeA = domainB.some(s => s.day === slotA.day && s.period === slotA.period && s.room_code === slotA.room_code);
    if (!aCanTakeB || !bCanTakeA) continue;

    // Tentative swap
    const newAssignment = new Map(current);
    newAssignment.set(idA, { ...slotA, day: slotB.day, period: slotB.period, room_code: slotB.room_code, start: slotB.start, end: slotB.end });
    newAssignment.set(idB, { ...slotB, day: slotA.day, period: slotA.period, room_code: slotA.room_code, start: slotA.start, end: slotA.end });

    const newCost = computeCost(newAssignment);
    const delta = newCost - currentCost;

    if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
      current = newAssignment;
      currentCost = newCost;

      if (currentCost < bestCost) {
        best = new Map(current);
        bestCost = currentCost;
      }
    }

    temperature *= coolingRate;
  }

  return best;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/solver/anneal.js
git commit -m "feat: simulated annealing post-processor for soft constraint optimisation"
```

---

## Task 10: Solver — Orchestrator

**Files:**
- Create: `lib/solver/index.js`

- [ ] **Step 1: Create lib/solver/index.js**

```js
// lib/solver/index.js
import { buildLevelMap } from "./subgroups.js";
import { expandAll }     from "./expand.js";
import { buildTimeGrid, buildDomains } from "./domains.js";
import { solveWithRestarts } from "./backtrack.js";
import { anneal }        from "./anneal.js";
import { getDb }         from "../db.js";

/**
 * Run the full 3-phase solver for an institution's active term.
 *
 * @param {string} institutionId - string ObjectId
 * @param {string} termLabel
 * @returns {{ entries: object[], infeasible: object[], stats: object }}
 */
export async function runSolver(institutionId, termLabel) {
  const db = await getDb();
  const { ObjectId } = await import("mongodb");
  const iOid = new ObjectId(institutionId);

  // ── Load data ────────────────────────────────────────────────────────────────
  const [institution, courses, allAvail, levelsConfig] = await Promise.all([
    db.collection("institutions").findOne({ _id: iOid }),
    db.collection("courses").find({ institution_id: iOid, deleted_at: null }).toArray(),
    db.collection("availability").find({ institution_id: iOid, term_label: termLabel }).toArray(),
    db.collection("settings").findOne({ institution_id: iOid, type: "levels_config" }),
  ]);

  if (!institution) throw Object.assign(new Error("Institution not found"), { status: 404 });
  if (!levelsConfig?.data?.levels?.length) throw Object.assign(new Error("No levels configured. Set up groups first."), { status: 400 });
  if (!courses.length) throw Object.assign(new Error("No courses found."), { status: 400 });

  // ── Build availability map: staffId → available_days[] ──────────────────────
  const availabilityMap = new Map();
  for (const a of allAvail) {
    availabilityMap.set(a.user_id.toString(), a.available_days ?? []);
  }

  // ── Phase 0: expand sessions ─────────────────────────────────────────────────
  const levelMap  = buildLevelMap(levelsConfig.data.levels);
  const sessions  = expandAll(courses, levelMap);

  if (sessions.length === 0) throw Object.assign(new Error("No sessions to schedule after expansion."), { status: 400 });

  // ── Phase 1: AC-3 domain trimming ────────────────────────────────────────────
  const timeGrid = buildTimeGrid(institution);
  const { domains, infeasible } = buildDomains(sessions, timeGrid, availabilityMap, institution);

  if (infeasible.length > 0) {
    return {
      entries: [],
      infeasible,
      stats: { totalSessions: sessions.length, assignedSessions: 0, phase: "domain_trimming" },
    };
  }

  // ── Phase 2: Backtracker ──────────────────────────────────────────────────────
  const { assignment, success, restarts, backtracks } = solveWithRestarts(sessions, domains);

  // ── Phase 3: SA post-processing (only if feasible solution found) ─────────────
  const finalAssignment = success ? anneal(assignment, sessions, domains, 800) : assignment;

  // ── Build output entries ─────────────────────────────────────────────────────
  const entries = [];
  for (const [sessionId, slot] of finalAssignment) {
    entries.push({
      course_id:      slot.course_id,
      course_code:    slot.course_code,
      course_name:    slot.course_name,
      session_type:   slot.session_type,
      level:          slot.level,
      room_code:      slot.room_code,
      staff_id:       slot.staff_id,
      day:            slot.day,
      period:         slot.period,
      start:          slot.start,
      end:            slot.end,
      subgroup:       slot.subgroup ?? null,
      groups_covered: slot.groups_covered ?? [],
    });
  }

  return {
    entries,
    infeasible: [],
    stats: {
      totalSessions:    sessions.length,
      assignedSessions: entries.length,
      success,
      restarts,
      backtracks,
      phase: success ? "annealing_complete" : "partial",
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/solver/index.js
git commit -m "feat: solver orchestrator — 3-phase AC3 → backtrack → anneal"
```

---

## Task 11: Wire Solver into Schedule Generate Route

**Files:**
- Modify: `app/api/coordinator/schedule/generate/route.js`

- [ ] **Step 1: Replace generate route**

Replace `app/api/coordinator/schedule/generate/route.js` entirely:

```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveInstitutionId } from "@/app/api/coordinator/_helpers/resolve-institution";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { ScheduleJobStatus, isSolverInfeasibleResult, buildInfeasibleError } from "@/lib/scheduleJobContract";
import { runSolver } from "@/lib/solver/index";

// ── GET /api/coordinator/schedule/generate ────────────────────────────────────
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
        error:         job.error ?? null,
        schedule:      job.schedule_id ? { id: job.schedule_id.toString() } : null,
        stats:         job.stats ?? null,
      });
    }

    const [coursesCount, staffCount, availCount, constraintDoc, recentJobs] = await Promise.all([
      db.collection("courses").countDocuments({ institution_id: iOid, deleted_at: null }),
      db.collection("users").countDocuments({ institution_id: iOid, deleted_at: null, role: { $in: ["professor","ta"] } }),
      db.collection("availability").countDocuments({ institution_id: iOid }),
      db.collection("settings").findOne({ institution_id: iOid, type: "levels_config" }),
      db.collection("schedule_jobs").find({ institution_id: iOid }).sort({ created_at: -1 }).limit(5).toArray(),
    ]);

    return NextResponse.json({
      stats:    { courses: coursesCount, staff: staffCount },
      readiness: {
        courses:     coursesCount > 0,
        staff:       staffCount > 0,
        availability: availCount > 0,
        levels:      !!constraintDoc,
      },
      recentJobs: recentJobs.map(j => ({
        id:             j._id.toString(),
        status:         j.status,
        status_message: j.status_message ?? null,
        term_label:     j.term_label,
        sessions_count: j.sessions_count ?? 0,
        error:          j.error ?? null,
        created_at:     j.created_at,
        stats:          j.stats ?? null,
      })),
    });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}

// ── POST /api/coordinator/schedule/generate ───────────────────────────────────
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
    const updateJob = (patch) => db.collection("schedule_jobs").updateOne({ _id: jobId }, { $set: patch });

    // Run solver asynchronously so HTTP returns immediately for polling
    const runAsync = async () => {
      try {
        await updateJob({ status_message: "Expanding sessions..." });

        const result = await runSolver(iOid.toString(), termLabel);

        if (result.infeasible.length > 0) {
          await updateJob({
            status:         ScheduleJobStatus.FAILED_INFEASIBLE,
            status_message: "Solver could not find valid slots for all sessions.",
            error: {
              type:      "infeasible",
              message:   `${result.infeasible.length} session(s) have no valid slot.`,
              details:   result.infeasible,
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
          status:         ScheduleJobStatus.COMPLETED,
          status_message: result.stats.success ? "Schedule generated successfully." : "Partial schedule generated — some sessions could not be placed.",
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

    return NextResponse.json({ ok: true, jobId: jobId.toString(), message: "Solver started. Poll for status." });

  } catch (err) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: err.status ?? 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/coordinator/schedule/generate/route.js
git commit -m "feat: wire Next.js solver into schedule generate route, remove FastAPI dependency"
```

---

## Task 12: Update Courses UI Form

**Files:**
- Modify: `app/coordinator/courses/page.js`

- [ ] **Step 1: Update form state and modal**

In `app/coordinator/courses/page.js`, replace the form state initial value:

```js
const [form, setForm] = useState({
  code:               "",
  name:               "",
  credit_hours:       "3",
  level:              "1",
  has_lecture:        true,
  has_tutorial:       false,
  has_lab:            false,
  has_tut_lab:        false,
  groups_per_lecture: "1",
  professor_id:       "",
  ta_ids:             [],
});
```

- [ ] **Step 2: Load staff list for professor/TA dropdowns**

Add a staff loading effect alongside the courses load:

```js
const [staff, setStaff] = useState([]);

const loadStaff = useCallback(async () => {
  try {
    const res  = await fetch("/api/coordinator/staff?limit=200");
    const json = await res.json();
    if (res.ok) setStaff(json.items ?? []);
  } catch {}
}, []);

useEffect(() => { load(); loadStaff(); }, [load, loadStaff]);

const professors = staff.filter(s => s.role === "professor");
const tas        = staff.filter(s => s.role === "ta");
```

- [ ] **Step 3: Update handleCreateOrUpdate payload**

Replace the payload block in `handleCreateOrUpdate`:

```js
const payload = {
  code:               form.code.trim().toUpperCase(),
  name:               form.name.trim(),
  credit_hours:       parseInt(form.credit_hours) || 3,
  level:              parseInt(form.level),
  has_lecture:        form.has_lecture,
  has_tutorial:       form.has_tutorial,
  has_lab:            form.has_lab,
  has_tut_lab:        form.has_tut_lab,
  groups_per_lecture: parseInt(form.groups_per_lecture) || 1,
  professor_id:       form.professor_id || null,
  ta_ids:             form.ta_ids,
};
```

- [ ] **Step 4: Replace modal form fields**

Replace the modal body `<div className="form-grid">` contents:

```jsx
<div className="form-grid">
  <Input label="Course Code" value={form.code}
    onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
    placeholder="e.g. SET221" />
  <Input label="Course Name" value={form.name}
    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
    placeholder="e.g. Electronic Design Automation" />
  <Input label="Credit Hours" type="number" value={form.credit_hours}
    onChange={e => setForm(p => ({ ...p, credit_hours: e.target.value }))} />

  <div className="form-field">
    <label className="form-label">Level</label>
    <select className="form-select" value={form.level}
      onChange={e => setForm(p => ({ ...p, level: e.target.value }))}>
      <option value="0">Freshman (Level 0)</option>
      <option value="1">Level 1</option>
      <option value="2">Level 2</option>
      <option value="3">Level 3</option>
      <option value="4">Level 4</option>
    </select>
  </div>

  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
    <label className="form-label">Session Types</label>
    <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
      {[
        { key:"has_lecture",  label:"Lecture (2h)" },
        { key:"has_tutorial", label:"Tutorial (2h)" },
        { key:"has_lab",      label:"Lab (1h)" },
        { key:"has_tut_lab",  label:"Tutorial + Lab" },
      ].map(({ key, label }) => (
        <label key={key} style={{ display:"flex", alignItems:"center", gap:6 }}>
          <input type="checkbox" checked={form[key]}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} />
          {label}
        </label>
      ))}
    </div>
  </div>

  {form.has_lecture && (
    <Input label="Groups per Lecture" type="number" value={form.groups_per_lecture}
      onChange={e => setForm(p => ({ ...p, groups_per_lecture: e.target.value }))}
      placeholder="1 = each group separate" />
  )}

  <div className="form-field">
    <label className="form-label">Professor</label>
    <select className="form-select" value={form.professor_id}
      onChange={e => setForm(p => ({ ...p, professor_id: e.target.value }))}>
      <option value="">— Unassigned —</option>
      {professors.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  </div>

  <div className="form-field">
    <label className="form-label">Teaching Assistants</label>
    <select className="form-select" multiple value={form.ta_ids}
      onChange={e => setForm(p => ({
        ...p,
        ta_ids: Array.from(e.target.selectedOptions, o => o.value),
      }))}>
      {tas.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
    <p style={{ fontSize:11, color:"var(--color-text-muted)", marginTop:4 }}>
      Hold Ctrl/Cmd to select multiple TAs
    </p>
  </div>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add app/coordinator/courses/page.js
git commit -m "feat: update courses form — level, session type flags, groups_per_lecture, professor+TA assignment"
```

---

## Task 13: Update Groups UI (levels_config)

**Files:**
- Modify: `app/coordinator/groups/page.js`

- [ ] **Step 1: Replace groups page**

Replace `app/coordinator/groups/page.js` entirely:

```jsx
"use client";
import { useState, useEffect, useCallback } from "react";
import "./styles.css";
import Button from "@/components/Button";
import Toast from "@/components/Toast";
import SkeletonPage from "@/components/SkeletonPage";
import ErrorState from "@/components/ErrorState";
import { Input } from "@/components/Input";
import { GraduationCapIcon } from "@/components/icons/index";

const DEFAULT_LEVELS = [
  { level: 0, label: "Freshman", groups: [{ group_id: "GA", subgroup_count: 12 }, { group_id: "GB", subgroup_count: 9 }] },
  { level: 1, label: "Level 1",  groups: [{ group_id: "G1", subgroup_count: 3 }, { group_id: "G2", subgroup_count: 3 }, { group_id: "G3", subgroup_count: 3 }] },
  { level: 2, label: "Level 2",  groups: [{ group_id: "G1", subgroup_count: 3 }, { group_id: "G2", subgroup_count: 3 }] },
  { level: 3, label: "Level 3",  groups: [{ group_id: "G1", subgroup_count: 3 }, { group_id: "G2", subgroup_count: 2 }] },
  { level: 4, label: "Level 4",  groups: [{ group_id: "G1", subgroup_count: 0 }] },
];

export default function CoordinatorGroupsPage() {
  const [levels, setLevels]   = useState(DEFAULT_LEVELS);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState({ open:false, variant:"info", title:"", message:"", id:0 });

  const showToast = (v, t, m) => setToast({ open:true, variant:v, title:t, message:m, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/coordinator/groups");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      if (json.levels?.length > 0) setLevels(json.levels);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateSubgroupCount(lvIdx, gIdx, value) {
    setLevels(prev => prev.map((lv, li) =>
      li !== lvIdx ? lv : {
        ...lv,
        groups: lv.groups.map((g, gi) =>
          gi !== gIdx ? g : { ...g, subgroup_count: Math.max(0, parseInt(value) || 0) }
        )
      }
    ));
  }

  function addGroup(lvIdx) {
    setLevels(prev => prev.map((lv, li) => {
      if (li !== lvIdx) return lv;
      const next = lv.groups.length + 1;
      const prefix = lv.level === 0 ? String.fromCharCode(65 + lv.groups.length) : `G${next}`;
      return { ...lv, groups: [...lv.groups, { group_id: prefix, subgroup_count: 3 }] };
    }));
  }

  function removeGroup(lvIdx, gIdx) {
    setLevels(prev => prev.map((lv, li) =>
      li !== lvIdx ? lv : { ...lv, groups: lv.groups.filter((_, gi) => gi !== gIdx) }
    ));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/coordinator/groups", {
        method:  "PUT",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({ levels }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      showToast("success", "Saved", "Level configuration saved successfully.");
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <SkeletonPage stats={4} rows={3} />;
  if (error)   return <div className="groups-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="groups-page">
      <main className="groups-shell">
        <div className="page-header">
          <h1>Level Groups</h1>
          <p>Configure groups and subgroups per academic level. The solver uses this to expand courses into sessions.</p>
        </div>

        {levels.map((lv, lvIdx) => (
          <section key={lv.level} className="panel reveal" style={{ marginBottom:20 }}>
            <div className="panel-head">
              <div>
                <h2>{lv.label} <span style={{ fontSize:12, color:"var(--color-text-muted)" }}>(Level {lv.level})</span></h2>
                <p>{lv.groups.length} group{lv.groups.length !== 1 ? "s" : ""}</p>
              </div>
              <Button variant="ghost" onClick={() => addGroup(lvIdx)}>+ Add Group</Button>
            </div>

            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {lv.groups.map((g, gIdx) => (
                <div key={gIdx} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"var(--color-surface)", borderRadius:12, border:"1px solid var(--color-border)" }}>
                  <GraduationCapIcon size={14} />
                  <span style={{ fontWeight:600, fontSize:13 }}>{g.group_id}</span>
                  <Input
                    type="number"
                    value={g.subgroup_count}
                    onChange={e => updateSubgroupCount(lvIdx, gIdx, e.target.value)}
                    style={{ width:70, textAlign:"center" }}
                    title="Subgroup count (0 = no subgroups)"
                  />
                  <span style={{ fontSize:11, color:"var(--color-text-muted)" }}>subgroups</span>
                  <button onClick={() => removeGroup(lvIdx, gIdx)} style={{ background:"none", border:"none", cursor:"pointer", color:"#FF3B30", fontSize:16 }} title="Remove group">×</button>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div style={{ marginTop:24 }}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </main>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message}
        onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/coordinator/groups/page.js
git commit -m "feat: redesign groups page with per-group subgroup count editor"
```

---

## Task 14: Update Published Schedule View (level-tabbed grid)

**Files:**
- Modify: `app/coordinator/schedule/published/page.js`

- [ ] **Step 1: Replace published schedule page**

Replace `app/coordinator/schedule/published/page.js` entirely:

```jsx
"use client";
import { useState, useEffect, useCallback } from "react";
import "./styles.css";
import SkeletonPage from "@/components/SkeletonPage";
import ErrorState from "@/components/ErrorState";
import Toast from "@/components/Toast";
import Button from "@/components/Button";

const PERIODS = [1,2,3,4,5,6,7,8,9,10];

export default function CoordinatorPublishedPage() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeLevel, setActiveLevel] = useState(null);
  const [toast,      setToast]      = useState({ open:false, variant:"info", title:"", message:"", id:0 });

  const showToast = (v, t, m) => setToast({ open:true, variant:v, title:t, message:m, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/coordinator/schedule/published");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
      if (json.levels?.length > 0 && activeLevel === null) {
        setActiveLevel(json.levels[0].level);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUnpublish() {
    if (!data?.scheduleId) return;
    try {
      const res = await fetch("/api/coordinator/schedule/published", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ action:"unpublish", scheduleId: data.scheduleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast("success", "Unpublished", "Schedule has been unpublished.");
      load();
    } catch (e) { showToast("danger", "Error", e.message); }
  }

  if (loading) return <SkeletonPage stats={3} rows={5} />;
  if (error)   return <div className="published-page"><ErrorState message={error} onRetry={load} /></div>;

  if (!data?.scheduleId) {
    return (
      <div className="published-page">
        <main className="published-shell">
          <div className="page-header">
            <h1>Published Schedule</h1>
            <p>No published schedule yet. Generate and approve a schedule first.</p>
          </div>
        </main>
      </div>
    );
  }

  const currentLevelData = data.levels?.find(l => l.level === activeLevel);

  return (
    <div className="published-page">
      <main className="published-shell">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div className="page-header">
            <h1>Published Schedule</h1>
            <p>{data.termLabel} · Published {data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : ""}</p>
          </div>
          <Button variant="ghost" onClick={handleUnpublish}>Unpublish</Button>
        </div>

        {/* Level tabs */}
        <div className="filter-tabs" style={{ marginBottom:20 }}>
          {(data.levels ?? []).map(lv => (
            <button
              key={lv.level}
              className={`filter-tab${activeLevel === lv.level ? " filter-tab--active" : ""}`}
              onClick={() => setActiveLevel(lv.level)}
            >
              {lv.label}
            </button>
          ))}
        </div>

        {currentLevelData && (
          <ScheduleGrid levelData={currentLevelData} institution={data.institution} />
        )}
      </main>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message}
        onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}

function ScheduleGrid({ levelData, institution }) {
  const workingDays = institution?.working_days ?? ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
  const numPeriods  = institution?.num_periods ?? 10;
  const periods     = Array.from({ length: numPeriods }, (_, i) => i + 1);

  // Build columns: one per subgroup (or group if no subgroups)
  const columns = levelData.columns ?? [];

  // Build lookup: day-period-subgroup → entry
  const lookup = {};
  for (const entry of levelData.entries ?? []) {
    const key = `${entry.day}|${entry.period}|${entry.subgroup ?? entry.groups_covered?.[0]}`;
    lookup[key] = entry;
  }

  return (
    <div style={{ overflowX:"auto" }}>
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Period</th>
            {columns.map(col => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {workingDays.map(day =>
            periods.map((period, pi) => (
              <tr key={`${day}-${period}`}>
                {pi === 0 && <td rowSpan={numPeriods} className="day-cell">{day}</td>}
                <td className="period-cell">P{period}<br/><span style={{ fontSize:10 }}>{entry?.start ?? ""}</span></td>
                {columns.map(col => {
                  const entry = lookup[`${day}|${period}|${col}`];
                  if (!entry) return <td key={col} className="empty-cell" />;
                  return (
                    <td key={col} className={`session-cell session-cell--${entry.session_type}`}>
                      <span className="session-room">{entry.room_code}</span>
                      <span className="session-code">{entry.course_code}</span>
                      <span className="session-name">{entry.course_name}</span>
                      <span className="session-type-badge">{entry.session_type}</span>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Update published route to return level-grouped data**

In `app/api/coordinator/schedule/published/route.js`, replace the GET return to group entries by level and build columns:

```js
// After building enriched entries array, group by level:
const levelsConfig = await db.collection("settings").findOne({ institution_id: iOid, type: "levels_config" });
const levelsList   = levelsConfig?.data?.levels ?? [];

const levelMap = {};
for (const entry of enriched) {
  const lvNum = entry.level ?? 0;
  if (!levelMap[lvNum]) levelMap[lvNum] = [];
  levelMap[lvNum].push(entry);
}

const levels = levelsList.map(lv => {
  const entries = levelMap[lv.level] ?? [];
  // Build unique sorted columns (subgroups + groups)
  const colSet = new Set();
  for (const e of entries) {
    if (e.subgroup) colSet.add(e.subgroup);
    else for (const g of (e.groups_covered ?? [])) colSet.add(g);
  }
  const columns = [...colSet].sort();
  return { level: lv.level, label: lv.label, columns, entries };
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
```

- [ ] **Step 3: Commit**

```bash
git add app/coordinator/schedule/published/page.js app/api/coordinator/schedule/published/route.js
git commit -m "feat: published schedule view — level tabs + subgroup grid"
```

---

## Task 15: Run Migration + Deploy

**Files:**
- Create: `scripts/setup-db-v2.mjs` (updated setup with new validators)

- [ ] **Step 1: Run the migration on the DB**

```bash
cd /Users/anas/Projects/sch/schedula
pnpm db:migrate
```

Expected output:
```
Migrating courses...
  ✅ N courses migrated
Migrating availability...
  ✅ N availability docs migrated
Migrating groups settings...
  ✅ groups settings migrated to levels_config
Migrating schedule entries...
  ✅ N schedules entries enriched
Dropping rooms collection...
  ✅ rooms collection dropped
🎉 Migration complete.
```

- [ ] **Step 2: Verify dev server still works**

```bash
pnpm dev
```

Navigate to `/coordinator/courses` — confirm page loads with new form shape.
Navigate to `/coordinator/groups` — confirm levels_config UI loads.
Navigate to `/coordinator/schedule/generate` — confirm readiness panel loads.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: complete Schedula solver migration — Next.js 3-phase solver, hardcoded rooms, redesigned schemas"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Rooms hardcoded (`lib/rooms.js`) — Task 2
- ✅ Durations fixed (`lib/durations.js`) — Task 2
- ✅ Courses schema redesigned (level, flags, professor_id, ta_ids, groups_per_lecture) — Tasks 3 + 12
- ✅ Availability → available_days — Task 5
- ✅ Groups → levels_config — Tasks 4 + 13
- ✅ Subgroup derivation utility — Task 6
- ✅ Session expansion (descending level order) — Task 6
- ✅ AC-3 domain trimming — Task 7
- ✅ Greedy backtracker with MCV + forward checking + restarts — Task 8
- ✅ Soft cost function (campus days + idle gaps) — Task 8
- ✅ Simulated annealing — Task 9
- ✅ Solver orchestrator — Task 10
- ✅ Generate route wired — Task 11
- ✅ Published view grid — Task 14
- ✅ DB migration script — Task 15
- ✅ Critical bugs (BUG-001/002/003/004/005) — Task 1
- ✅ Middleware renamed — Task 1
