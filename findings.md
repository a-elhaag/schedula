# Schedula — Full Project Audit

**Date:** 2026-05-01  
**Scope:** Full codebase parse — bugs, improvements, and Next.js-only migration requirements

---

## Legend
- 🔴 **Bug** — broken or incorrect behaviour
- 🟡 **Improvement** — works but has a flaw worth fixing
- 🟢 **Migration Required** — needed to remove FastAPI dependency

---

## 1. Bugs

### BUG-001 🔴 — `proxy.js` is not used as Next.js middleware
**File:** [proxy.js](proxy.js)  
**Problem:** The middleware file must be named `middleware.js` (or `middleware.ts`) at the project root for Next.js to pick it up automatically. The current file is named `proxy.js`, so **route protection is completely bypassed** — every page is publicly accessible regardless of auth state.  
**Fix:** Rename `proxy.js` → `middleware.js`. The exported `config.matcher` and `proxy` function should be renamed to the default export `middleware`.

---

### BUG-002 🔴 — Middleware exports wrong function name
**File:** [proxy.js](proxy.js:51)  
**Problem:** Next.js middleware must export a function named `middleware` as the default export. The file exports `proxy` (named export) and `config`. Next.js will not invoke `proxy` — it only looks for `export default function middleware(...)` or `export function middleware(...)`.  
**Fix:** Rename `export async function proxy(request)` → `export async function middleware(request)`.

---

### BUG-003 🔴 — `hashPassword` imported from wrong module in `signin/route.js`
**File:** [app/api/auth/signin/route.js](app/api/auth/signin/route.js:4)  
**Problem:** `hashPassword` is imported from `@/lib/auth` but it lives in `@/lib/password`. `lib/auth.js` does not export `hashPassword` — it only exports `signToken`, `verifyToken`, and `generateToken`. The import will silently produce `undefined`, causing `hashPassword(rawRefreshToken)` to throw at runtime when hashing the refresh token.  
**Fix:** Change import to `import { comparePassword, hashPassword } from "@/lib/password";` (already correct for `comparePassword`, but `hashPassword` needs to come from `password` not `auth`).

> **Note:** The `generateToken` import on line 5 is correct (`@/lib/auth` exports it). Only `hashPassword` is misplaced.

---

### BUG-004 🔴 — `generateToken` and `hashPassword` imported from wrong module in `staff/route.js`
**File:** [app/api/coordinator/staff/route.js](app/api/coordinator/staff/route.js:7)  
**Problem:** `import { generateToken, hashPassword } from "@/lib/auth"` — `hashPassword` is not exported from `lib/auth.js`. It will be `undefined`.  
**Fix:** Split the import: keep `generateToken` from `@/lib/auth`, add `hashPassword` from `@/lib/password`.

---

### BUG-005 🔴 — Import of `iOid` in `import/route.js` bypasses `resolveInstitutionId`
**File:** [app/api/coordinator/import/route.js](app/api/coordinator/import/route.js:78)  
**Problem:** `const iOid = new ObjectId(institutionId)` — this does not call `resolveInstitutionId()`, which is the validated path that also handles the BYPASS_AUTH demo-institution case. If `institutionId` is `"demo-institution"` (from BYPASS_AUTH), this throws because it's not a valid ObjectId.  
**Fix:** Use `const iOid = await resolveInstitutionId(institutionId)` (same as every other coordinator route).

---

### BUG-006 🔴 — Staff import CSV parsing doesn't handle JSON files
**File:** [app/api/coordinator/import/route.js](app/api/coordinator/import/route.js:141-155)  
**Problem:** The `staff` and `rooms` import branches always use CSV row-splitting (`row.split(",")`) even when a `.json` file is uploaded. Only the `courses` branch checks `file.name.endsWith(".json")`. Uploading a JSON staff list will produce garbage data.  
**Fix:** Add JSON handling to the `staff` and `rooms` branches the same way `courses` handles it.

---

### BUG-007 🔴 — `findOneAndUpdate` / `findOneAndDelete` return shape changed in MongoDB driver v5+
**File:** [app/api/coordinator/staff/[id]/route.js](app/api/coordinator/staff/%5Bid%5D/route.js:55), line 94  
**Problem:** The code does `const updatedUser = result?.value || result` — in MongoDB driver v7 (which this project uses per `package.json`), `findOneAndUpdate` and `findOneAndDelete` return the document directly (not wrapped in `{ value: doc }`). The `?.value` fallback is harmless but the primary check will always be falsy and fall through to `result`, which is correct. However, if `result` is `null` (document not found), the `|| result` coercion returns `null`, and the next `if (!updatedUser)` check works. The behaviour is accidentally correct but fragile — log a note.  
**Improvement:** Change to `const updatedUser = result` directly (no `?.value`).

---

### BUG-008 🔴 — CSV import skips rows with commas in quoted fields
**File:** [app/api/coordinator/import/route.js](app/api/coordinator/import/route.js:109)  
**Problem:** `row.split(",")` does not handle RFC 4180 CSV quoting. A room name like `"Hall, North Wing"` will be split incorrectly producing wrong column offsets for all subsequent fields.  
**Fix:** Use `papaparse` (already in `dependencies`) to parse CSV rows instead of manual splitting. Apply to all three CSV branches.

---

### BUG-009 🟡 — Schedule generate: `runSolverAsync` closure captures `solverUnavailable` before it's set
**File:** [app/api/coordinator/schedule/generate/route.js](app/api/coordinator/schedule/generate/route.js:157)  
**Problem:** `const usedFallback = Boolean(fastApiUrl) && solverUnavailable` is evaluated inside `runFallbackAsync`, which is itself called from inside the `catch` block of `runSolverAsync`. The closure captures the `solverUnavailable` variable correctly (it's set to `true` just before `runFallbackAsync()` is called), so this works. However, the duplicate `if (!fastApiUrl)` check on line 273 will never be reached because the earlier `if (fastApiUrl)` block already `return`s before line 273. This is dead code.  
**Fix:** Remove the redundant `if (!fastApiUrl)` block at lines 272-276. Move `runFallbackAsync().catch(console.error)` call into the else branch of `if (fastApiUrl)`.

---

### BUG-010 🔴 — Groups page: `Spinner` is imported but never used
**File:** [app/coordinator/groups/page.js](app/coordinator/groups/page.js:9)  
**Problem:** `import Spinner from "@/components/Spinner"` is present but `<Spinner>` is never rendered. This is a dead import (minor but produces lint warnings).  
**Fix:** Remove the unused import.

---

### BUG-011 🔴 — Staff page: `Spinner` is imported but never used
**File:** [app/coordinator/staff/page.js](app/coordinator/staff/page.js:9)  
**Problem:** Same as above — `Spinner` imported but not used.  
**Fix:** Remove the unused import.

---

### BUG-012 🟡 — `detectConflicts` only checks room/staff double-booking, not subgroup overlap
**File:** [lib/server/coordinatorService.js](lib/server/coordinatorService.js:322-385)  
**Problem:** The conflict detector groups entries by `${day}-${start}-${end}` and only flags duplicate room or staff IDs within the same slot. It does **not** detect subgroup conflicts (HC-4) or LEC+TUT overlap for the same group (HC-3). Per the constraint spec, these are Priority 1 hard constraints. The solver output could have hidden subgroup conflicts that appear "clean" in the review UI.  
**Fix (migration):** When the CP-SAT solver is built in Next.js, it must validate HC-1 through HC-10 before writing the schedule. The `detectConflicts` service function should also be extended to check group-level overlaps.

---

### BUG-013 🟡 — `coordinatorService.getCoordinatorCourses` double-queries DB (count after find)
**File:** [lib/server/coordinatorService.js](lib/server/coordinatorService.js:50)  
**Problem:** `countDocuments` runs a separate query after `find(...).toArray()` with the same filter. For large collections this is an extra round-trip.  
**Fix:** Use MongoDB aggregation with `$facet` to get both count and items in one query, or pass the count through the cursor's metadata.

---

### BUG-014 🔴 — `app/coordinator/layout.js`: Two nav items share the same icon (`GraduationCapIcon` for Rooms AND Groups; `BoltIcon` for Constraints AND Generate AND Analytics)
**File:** [app/coordinator/layout.js](app/coordinator/layout.js:24-35)  
**Problem:** Navigation icons are incorrectly reused — visually confusing for users.  
**Fix:** Assign semantically correct icons: Rooms → `HomeIcon` or a building icon; Groups → `GraduationCapIcon`; Generate → `RocketIcon`; Analytics → `BoltIcon`; Constraints → `SettingsIcon`.

---

### BUG-015 🟡 — `verifyEmail` checks for already-verified AFTER looking up by unexpired token
**File:** [app/api/auth/verify-email/route.js](app/api/auth/verify-email/route.js:61-95)  
**Problem:** The query `{ email_verify_token: token, email_verify_expires_at: { $gt: new Date() } }` will return `null` for an already-verified user (because `email_verify_token` was set to `null` on verification). The already-verified check at line 86 never fires for these users — they get the generic "invalid or expired" message instead of the friendly "already verified" message.  
**Fix:** Query without the expiry filter first, then check `email_verified_at` before checking expiry. Or: query `{ email_verify_token: token }` and handle `expired` and `already_verified` as separate branches.

---

### BUG-016 🟡 — Workload calculation assumes max 20 sessions/week (hardcoded)
**File:** [lib/server/coordinatorService.js](lib/server/coordinatorService.js:316)  
**Problem:** `const workload = Math.round((sessionCount / 20) * 100)` — the "20 sessions/week" denominator is arbitrary and not configurable per institution.  
**Fix:** Pull `max_sessions_per_week` from the institution settings document, defaulting to 20 if not set.

---

### BUG-017 🟡 — Schedule `review/route.js` coverage stat calculation is misleading
**File:** [app/api/coordinator/schedule/review/route.js](app/api/coordinator/schedule/review/route.js:136-139)  
**Problem:** `coverage = sessions.length / (sessions.length + unresolvedConflicts.length)` — this is not a meaningful coverage metric. Conflicts are overlapping sessions, not missing sessions. A schedule with 100 sessions and 2 room conflicts would show 98% coverage, implying nothing is missing when in fact it's fully generated.  
**Fix:** Coverage should be `assignedSessions / totalRequiredSessions`. Total required sessions come from expanding courses × groups × session types (per the spec's Session Pre-Expansion Rule in §16.3).

---

## 2. Migration Required — FastAPI → Next.js Only

### M-001 🟢 — The solver is the only FastAPI dependency
**Files:** [app/api/coordinator/schedule/generate/route.js](app/api/coordinator/schedule/generate/route.js:97)  
**Analysis:** The only place `FASTAPI_URL` is used is in the `POST /api/coordinator/schedule/generate` route. All other features (auth, staff, rooms, courses, groups, constraints, availability, import, export) already run entirely in Next.js + MongoDB. The FastAPI solver produces schedule entries and writes them to the `schedules` collection.

**Current flow:**
```
POST /api/coordinator/schedule/generate
  → if FASTAPI_URL: call ${FASTAPI_URL}/schedule/generate
  → if unavailable or not set: runFallbackAsync() (basic round-robin scheduler)
```

**What needs to be built in Next.js to replace FastAPI:**
1. A constraint-based schedule generator (CP-SAT equivalent in JS)
2. It must respect all 10 hard constraints (HC-1 through HC-10)
3. It must optimise 9 soft constraints (SC-1 through SC-9)
4. Input: courses, groups, rooms, staff, availability from MongoDB
5. Output: `ScheduleSlot[]` written to `schedules` collection

---

### M-002 🟢 — Fallback scheduler already exists but is naive
**File:** [app/api/coordinator/schedule/generate/route.js](app/api/coordinator/schedule/generate/route.js:101-180)  
**Analysis:** `runFallbackAsync()` is a round-robin slot assignment with no constraint checking. It assigns courses to rooms in order, ignoring HC-1 (room conflicts), HC-2 (instructor conflicts), HC-4 (subgroup conflicts), HC-6 (room type match), HC-7 (level-day boundary), HC-10 (staff availability). It produces a schedule but it will always have violations.  
**What to do:** Replace this with the new Next.js solver. Keep the fallback mechanism structure (background async job + polling) but replace the body of `runFallbackAsync` with a proper solver.

---

### M-003 🟢 — Session pre-expansion logic is missing
**Analysis:** Before the solver can run, courses must be expanded into individual sessions per the §16.3 rule:
- LEC → 1 session per group (covering all subgroups)  
- TUT/LAB → 1 session per subgroup  

This expansion logic does not exist anywhere in the current Next.js codebase. The FastAPI solver handled it internally. It must be implemented in Next.js as a pre-processing step before scheduling.

---

### M-004 🟢 — No group/subgroup expansion data in DB
**Analysis:** The `groups` collection currently stores only top-level counts (`level_1: 3`, `level_2: 2`, etc.) but not the actual subgroup identifiers (e.g., `G1-1`, `G1-2`, `G1-3`). Per the spec (§3.2), subgroups have specific naming conventions. The solver needs the full group tree.  
**Fix:** Extend the groups data model to store the full group hierarchy including subgroup names and counts per group.

---

### M-005 🟢 — No room type / room constraints in current room schema
**Analysis:** The current room schema has `room_type`, `lab_type`, and `groups_capacity`. However, the constraint spec (§15.1) requires `restrictions.sessionTypes`, `restrictions.courseOnly`, and `restrictions.department`. These are not stored.  
**Fix:** Add constraint fields to the room schema and admin UI.

---

### M-006 🟢 — Staff availability is stored but not validated before solver runs
**File:** [app/api/coordinator/schedule/generate/route.js](app/api/coordinator/schedule/generate/route.js:36-43)  
**Analysis:** The generate route checks `availCount > 0` for readiness but does not validate that each assigned instructor has enough available slots to cover all their assigned sessions. HC-10 requires this check before the solver starts.  
**Fix:** Add a pre-solver validation step that flags instructors with insufficient availability.

---

### M-007 🟢 — `/api/solver/*` routes from spec §18.1 don't exist yet
**Analysis:** The spec defines:
```
POST /api/solver/run       → trigger solver, returns jobId
GET  /api/solver/status/[jobId]  → poll status
GET  /api/solver/result/[jobId]  → get schedule
```
Currently, solver triggering is embedded inside `/api/coordinator/schedule/generate`. The job polling is also embedded there. These should be extracted to their own routes.  
**Decision:** Can stay embedded for MVP — extract when solver becomes a separate concern.

---

### M-008 🟢 — No `GET /api/schedule/level/[level]` or `GET /api/schedule/group/[groupId]` routes
**Analysis:** Per spec §18.1, the schedule output should be queryable by level, group, instructor, and room. Currently the published schedule is returned as a flat list grouped by day. The student schedule (`/api/student/schedule`) queries by userId but doesn't support level/group filtering. The staff schedule returns by staffId.  
**Fix:** Add the missing query routes to allow per-level and per-group schedule views.

---

## 3. Improvements (non-blocking)

### I-001 — `lib/auth.js` vs `lib/jwt.js` duplication
Both files export JWT-related functions. `lib/auth.js` has `signToken`/`verifyToken` (it actually re-exports from `lib/jwt.js` based on `lib/server/auth.js` importing from `@/lib/jwt`). This is confusing.  
**Clarify:** `lib/jwt.js` should be the single source of JWT functions. `lib/auth.js` should only contain `generateToken` (the crypto random helper).

---

### I-002 — Rate limiter uses in-memory store (not suitable for multi-instance deployment)
**File:** [lib/rate-limiter.js](lib/rate-limiter.js)  
**Problem:** The rate limiter uses an in-memory map. On Vercel or any multi-instance deployment, each instance has its own map and limits are not shared across instances.  
**Fix:** Use Redis (Upstash) or MongoDB TTL collection for rate limit state.

---

### I-003 — No CSRF protection on state-mutating API routes
**Problem:** All `POST/PUT/DELETE` routes only verify the JWT token but not a CSRF token. For browser-based apps with httpOnly cookies, same-site cookies (`sameSite: "lax"`) provide partial protection, but it's worth noting.  
**Fix:** For production, add `sameSite: "strict"` or add a CSRF token check.

---

### I-004 — `accept-invite` flow sets `email_verified_at` without going through verify-email
**File:** [app/api/auth/accept-invite/route.js](app/api/auth/accept-invite/route.js)  
**Problem:** Staff invited via invite link set their password through `accept-invite`, which should also mark the email as verified. Needs verification that `email_verified_at` is set to `new Date()` in that route.  
**Fix:** Confirm the accept-invite route sets both `invite_status: "joined"` and `email_verified_at: new Date()`.

---

### I-005 — CSV export doesn't escape commas/quotes in field values
**File:** [app/api/coordinator/staff/export/route.js](app/api/coordinator/staff/export/route.js:47-50)  
**Problem:** `row.map(cell => `"${cell}"`)` wraps each cell in quotes but doesn't escape internal double-quotes. A staff name like `O'Brien, Dr.` would produce malformed CSV.  
**Fix:** Escape double-quotes inside values: `String(cell).replace(/"/g, '""')`.

---

### I-006 — Schedule review page coverage stat uses wrong denominator (see BUG-017)
Already listed above.

---

### I-007 — No pagination on `/api/coordinator/courses` or `/api/coordinator/rooms` in UI
**Problem:** The coordinator courses and rooms pages load all items at once with a default limit of 100. When the institution has many courses, this will be slow.  
**Fix:** Wire up the `Pagination` component (already exists in `components/`) to the courses and rooms pages.

---

## 4. Summary Table

| ID | Severity | File | Issue |
|----|----------|------|-------|
| BUG-001 | 🔴 Critical | proxy.js | Middleware not active — auth bypass |
| BUG-002 | 🔴 Critical | proxy.js | Wrong export name for middleware |
| BUG-003 | 🔴 Critical | auth/signin/route.js | `hashPassword` from wrong module |
| BUG-004 | 🔴 Critical | coordinator/staff/route.js | `hashPassword` from wrong module |
| BUG-005 | 🔴 Critical | coordinator/import/route.js | Bypasses `resolveInstitutionId` |
| BUG-006 | 🔴 High | coordinator/import/route.js | JSON staff import broken |
| BUG-007 | 🟡 Low | coordinator/staff/[id]/route.js | Fragile MongoDB v7 result handling |
| BUG-008 | 🔴 High | coordinator/import/route.js | CSV parser breaks on quoted commas |
| BUG-009 | 🟡 Medium | schedule/generate/route.js | Dead code after solver branch |
| BUG-010 | 🟡 Low | coordinator/groups/page.js | Unused import `Spinner` |
| BUG-011 | 🟡 Low | coordinator/staff/page.js | Unused import `Spinner` |
| BUG-012 | 🟡 High | coordinatorService.js | Conflict detection misses subgroup/LEC overlap |
| BUG-013 | 🟡 Low | coordinatorService.js | Double DB query for count |
| BUG-014 | 🔴 Medium | coordinator/layout.js | Wrong/duplicate nav icons |
| BUG-015 | 🟡 Medium | auth/verify-email/route.js | Already-verified message never shown |
| BUG-016 | 🟡 Low | coordinatorService.js | Hardcoded workload denominator |
| BUG-017 | 🟡 Medium | schedule/review/route.js | Coverage stat is misleading |
| M-001 | 🟢 | schedule/generate/route.js | Solver is only FastAPI dependency |
| M-002 | 🟢 | schedule/generate/route.js | Fallback scheduler is naive |
| M-003 | 🟢 | — | Session pre-expansion logic missing |
| M-004 | 🟢 | coordinator/groups/route.js | Subgroup naming/hierarchy not stored |
| M-005 | 🟢 | coordinator/rooms/route.js | Room constraint fields missing |
| M-006 | 🟢 | schedule/generate/route.js | No pre-solver availability validation |
| M-007 | 🟢 | — | Solver routes can stay embedded for MVP |
| M-008 | 🟢 | — | Missing schedule query routes by level/group |
