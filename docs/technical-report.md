# Schedula — Technical Report

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Distributed Architecture](#3-distributed-architecture)
4. [Stateless API Design](#4-stateless-api-design)
5. [Authentication & Security](#5-authentication--security)
6. [Data Layer & Consistency](#6-data-layer--consistency)
7. [Schedule Generation Pipeline](#7-schedule-generation-pipeline)
8. [Distributed Systems Analysis](#8-distributed-systems-analysis)
9. [Limitations](#9-limitations)
10. [Future Work](#10-future-work)
11. [Conclusion](#11-conclusion)

---

## 1. Introduction

Schedula is a web-based academic timetabling system designed to automate the construction of semester schedules for higher-education institutions. The core problem it solves is computationally hard: assigning teaching sessions — lectures, tutorials, and labs — to time slots and rooms while satisfying a set of hard constraints (no room double-booking, no instructor double-booking, subgroup exclusivity) and optimising against soft constraints (minimising student campus days, compacting schedules, avoiding gaps).

The system serves three distinct user roles: **coordinators**, who configure the institution and trigger schedule generation; **staff** (professors and teaching assistants), who submit availability and view their allocated sessions; and **students**, who view their published timetables.

This report documents the full technical design of Schedula: its architecture, API layer, security model, data model, solver pipeline, and an honest analysis of its distributed systems properties and current limitations.

---

## 2. System Overview

### 2.1 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime | Node.js (server-side), Edge Runtime (middleware) |
| Database | MongoDB 7 (via official Node driver) |
| Authentication | JWT (access token) + httpOnly cookie |
| Email | Azure Communication Services |
| PDF Export | jsPDF (`lib/generatePDF.js`) |
| CSV Processing | PapaParse |
| Logging | Pino |
| Rate Limiting | In-memory token bucket (`lib/rate-limiter.js`) |

### 2.2 Application Layers

```
Browser
  └── Next.js Pages (app/)
        └── Next.js API Routes (app/api/)
              ├── lib/server/auth.js       — identity resolution
              ├── lib/server/coordinatorService.js  — business logic
              ├── lib/solver/              — schedule generation engine
              └── lib/db.js               — MongoDB connection pool
```

### 2.3 User Roles and Routing

| Role | Entry Point | Capabilities |
|---|---|---|
| `coordinator` | `/coordinator/setup` | Full institution setup, schedule generation, staff management |
| `professor` | `/staff/schedule` | View assigned sessions, submit availability |
| `ta` | `/staff/schedule` | View assigned sessions, submit availability |
| `student` | `/student/schedule` | View published timetable by group/subgroup |

### 2.4 Key Collections

| Collection | Purpose |
|---|---|
| `users` | All user accounts with hashed passwords and email verification state |
| `institutions` | Institution configuration, active term, time settings |
| `courses` | Course definitions with session type flags and staff assignments |
| `availability` | Staff weekly availability by day |
| `rooms` | Room inventory with type and capacity |
| `schedules` | Generated schedule entries per level, per term |
| `schedule_jobs` | Async solver job state and progress tracking |
| `settings` | Flexible institution settings (levels_config, constraints) |

---

## 3. Distributed Architecture

### 3.1 Deployment Model

Schedula is deployed as a single Next.js application. The App Router consolidates the React frontend and the HTTP API into one process, which can be hosted on a serverless platform (Vercel) or a Node.js server. MongoDB is accessed remotely via `MONGODB_URI`.

Because Next.js on Vercel runs each API route as a stateless serverless function, the architecture is inherently horizontally scalable — any number of instances can handle incoming requests simultaneously. The database is the shared state layer.

### 3.2 Edge Middleware

`middleware.js` runs at the **Edge Runtime** — a V8 isolate with no Node.js APIs, deployed globally at CDN edge nodes close to users. It intercepts every request before it reaches the origin server and performs:

- Route classification (public vs. protected)
- JWT verification using the `jose` library (WebCrypto-compatible, works in Edge)
- Role-based access control
- Identity header injection: `x-user-id`, `x-user-role`, `x-user-email`, `x-user-institution`
- Unique request ID assignment via `crypto.randomUUID()`
- `BYPASS_AUTH` mode for local development

```
Request
  → Edge Middleware (global CDN node)
      → Verifies JWT, injects x-user-* headers
        → Next.js API Route Handler (origin)
            → getCurrentUser() reads injected headers (no DB call)
```

This two-phase auth model means the origin API handlers do not need to hit the database to verify identity — the edge node already did it and forwarded the result as trusted headers.

### 3.3 Asynchronous Job Execution

The solver is computationally intensive (greedy assignment + simulated annealing across all course levels). Running it synchronously inside a single HTTP request would exceed timeout limits on serverless platforms.

The generate endpoint implements a **fire-and-poll** pattern:

1. `POST /api/coordinator/schedule/generate` inserts a `schedule_job` document with `status: "running"` and returns the `jobId` immediately (sub-100ms response).
2. The solver runs in the background via `runAsync().catch(console.error)` — an unawaited Promise that executes concurrently with the response.
3. The client polls `GET /api/coordinator/schedule/generate?jobId=<id>` at intervals.
4. When the solver completes, it updates the job document to `status: "completed"` or `status: "failed"`.

```
Client                      Server
  │                            │
  │── POST /schedule/generate ─▶│
  │◀── { jobId: "abc..." } ────│  (immediate)
  │                            │  [solver runs async]
  │── GET ?jobId=abc ──────────▶│
  │◀── { status: "running" } ──│
  │── GET ?jobId=abc ──────────▶│
  │◀── { status: "completed" }─│
```

---

## 4. Stateless API Design

### 4.1 Identity Without Sessions

Schedula uses no server-side session store. Every API request is self-describing: identity is derived from either:

1. **Injected headers** (`x-user-id`, `x-user-role`, etc.) — set by the edge middleware after verifying the JWT. This is the primary path for browser requests.
2. **Cookie fallback** — `getCurrentUser()` in `lib/server/auth.js` reads the `auth_token` cookie directly and calls `verifyToken()` if headers are absent. This supports direct API calls that bypass the middleware path.

This means any API route instance — on any server, in any region — can authenticate any request without shared state.

### 4.2 Token Architecture

```
auth_token (httpOnly cookie, 30-min TTL)
  → Used for page navigation and direct API calls
  → Verified at edge by jose (WebCrypto)
  → Verified at origin by jsonwebtoken (Node.js)

refresh_token (stored as bcrypt hash in users collection)
  → Used by POST /api/auth/refresh to issue new auth_token
  → Rotated on each refresh
```

The access token carries: `sub` (userId), `email`, `role`, `institution`. No database lookup is needed to resolve identity — the token is the identity.

### 4.3 API Route Structure

All coordinator routes follow a consistent pattern:

```js
export async function GET(request) {
  const user = getCurrentUser(request, { requiredRole: "coordinator" });
  const iOid = await resolveInstitutionId(user.institutionId);
  const db   = await getDb();
  // ... query and return
}
```

`resolveInstitutionId()` handles the `BYPASS_AUTH` development case where the institution ID is the string `"demo-institution"` rather than a valid MongoDB ObjectId, preventing runtime conversion errors.

### 4.4 API Endpoints Summary

**Auth**

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new coordinator account |
| POST | `/api/auth/signin` | Sign in, receive JWT + refresh token |
| POST | `/api/auth/signout` | Clear auth cookies |
| POST | `/api/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/auth/verify-email` | Consume email verification token |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Consume reset token, set new password |
| POST | `/api/auth/invite` | Coordinator invites a staff member |
| POST | `/api/auth/accept-invite` | Staff member sets password via invite link |
| POST | `/api/auth/onboarding` | Complete institution profile after first sign-in |
| GET | `/api/auth/me` | Return current user identity |

**Coordinator**

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/coordinator/courses` | List / create courses |
| PUT/DELETE | `/api/coordinator/courses/[id]` | Update / delete a course |
| GET | `/api/coordinator/staff` | List staff with workload |
| PUT | `/api/coordinator/staff/[id]` | Update staff profile |
| GET | `/api/coordinator/staff/export` | Export staff list as CSV |
| GET/PUT | `/api/coordinator/groups` | Read / write levels configuration |
| GET/POST | `/api/coordinator/import` | Bulk import dashboard + file upload |
| GET | `/api/coordinator/constraints` | Read scheduling constraints |
| GET | `/api/coordinator/settings` | Read institution time settings |
| GET/POST | `/api/coordinator/schedule/generate` | Trigger solver / poll job status |
| GET/POST | `/api/coordinator/schedule/review` | Review generated schedule |
| GET | `/api/coordinator/schedule/published` | View published schedule |
| GET | `/api/coordinator/schedule/revisions` | List schedule revisions |
| GET | `/api/coordinator/analytics` | Dashboard statistics |
| GET | `/api/coordinator/assign` | View staff–course assignments |
| GET | `/api/coordinator/availability/status` | Staff availability summary |

**Staff & Student**

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/staff/availability` | Read / submit staff availability |
| GET | `/api/staff/schedule` | View assigned sessions |
| GET | `/api/student/schedule` | View published timetable |

**System**

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/version` | Build version |
| GET | `/api/auth/bypass-status` | Dev: report bypass mode state |

---

## 5. Authentication & Security

### 5.1 Registration and Onboarding

New coordinators register via `POST /api/auth/signup`. The route:

1. Validates email format and password length.
2. Checks for duplicate accounts.
3. Hashes the password with bcrypt (10 rounds) via `lib/password.js`.
4. Generates an email verification token (32-byte hex, 24-hour expiry).
5. Sends a verification email via Azure Communication Services.
6. Creates the user with `email_verified_at: null`.

After email verification, coordinators complete institution setup via the `/onboarding` page, which calls `POST /api/auth/onboarding` to create the `institutions` document.

Staff are onboarded via coordinator-initiated invites (`POST /api/auth/invite`), which send a one-time link. The `POST /api/auth/accept-invite` route validates the token, sets the password, and marks the email as verified.

### 5.2 JWT Security Properties

- Access tokens use RS256 or HS256 (configurable via `JWT_SECRET`) with a 30-minute TTL.
- Tokens are stored in `httpOnly` cookies — inaccessible to JavaScript, mitigating XSS theft.
- The `SameSite` attribute provides CSRF protection for standard browser flows.
- Edge verification uses `jose` (WebCrypto API) — no Node.js crypto is required at the CDN layer.
- Origin verification uses `jsonwebtoken` for the cookie fallback path.

### 5.3 Role-Based Access Control

The middleware enforces role-to-route binding before any API handler executes:

```js
const PROTECTED_ROUTES = {
  "/coordinator": ["coordinator"],
  "/staff":       ["professor", "ta"],
  "/student":     ["student"],
  "/onboarding":  ["coordinator", "professor", "ta", "student"],
};
```

If a user with role `student` requests `/coordinator/setup`, the middleware redirects them to `/student/schedule` — they never reach the API handler.

API routes enforce roles a second time via `getCurrentUser(request, { requiredRole: "coordinator" })`, providing defence-in-depth for direct API calls.

### 5.4 Rate Limiting

`lib/rate-limiter.js` implements a sliding window per action + IP/user-ID key. Sensitive auth endpoints (signin, signup, forgot-password, resend-verification) are rate-limited. The implementation uses an in-memory map — see [§9 Limitations](#9-limitations) for implications.

### 5.5 Password Security

Passwords are hashed with bcrypt at cost factor 10 (via `bcryptjs`). Raw passwords are never stored or logged. The refresh token is also bcrypt-hashed before storage — only the hash is persisted, not the token value.

---

## 6. Data Layer & Consistency

### 6.1 MongoDB Connection Pooling

`lib/db.js` maintains a singleton `MongoClient` per Node.js process. In development (hot-reload), the client is stored on `global._mongoClientPromise` to survive HMR cycles. In production, a module-level singleton is used.

The client is configured with MongoDB Server API v1 (`strict: true`, `deprecationErrors: true`), ensuring query compatibility across driver versions.

### 6.2 Schema Design

**Flat course schema** (post-migration from sections[] to top-level flags):

```json
{
  "_id": ObjectId,
  "institution_id": ObjectId,
  "code": "CS301",
  "name": "Algorithms",
  "level": 3,
  "has_lecture": true,
  "has_tutorial": true,
  "has_lab": false,
  "groups_per_lecture": 1,
  "professor_id": ObjectId,
  "ta_ids": [ObjectId],
  "deleted_at": null
}
```

**Schedule entry** (stored in `schedules.entries[]`):

```json
{
  "course_id": ObjectId,
  "course_code": "CS301",
  "session_type": "lecture",
  "level": 3,
  "room_code": "H1",
  "staff_id": ObjectId,
  "day": "Sunday",
  "period": 2,
  "start": "09:30",
  "end": "10:30",
  "subgroup": null,
  "groups_covered": ["G1", "G2"]
}
```

**Levels configuration** (stored in `settings` collection):

```json
{
  "type": "levels_config",
  "institution_id": ObjectId,
  "data": {
    "levels": [
      { "level": 1, "label": "Level 1", "groups": [{ "id": "G1", "subgroups": 3 }] }
    ]
  }
}
```

### 6.3 Consistency Model

MongoDB provides document-level atomicity. Schedula relies on this for:

- Single-document inserts (one `schedules` document per level) — atomic.
- Job status updates via `updateOne` — atomic.
- Multi-document operations (clearing old schedules then inserting new ones) — **not atomic**. A crash between the `deleteMany` and the subsequent inserts would leave the term with no schedule. This is a known limitation (see §9).

There are no MongoDB transactions in the current implementation. Given the low write concurrency expected (one coordinator per institution, one generate job at a time), this is acceptable for MVP.

### 6.4 Soft Deletes

Courses use `deleted_at: null` for soft deletes. All queries filter on `{ deleted_at: null }`. Users also use `deleted_at` for the same purpose. Hard deletes are not used on primary records.

---

## 7. Schedule Generation Pipeline

The solver lives in `lib/solver/` and implements a three-phase pipeline: session expansion, domain building, and assignment optimisation.

### 7.1 Phase 0 — Session Pre-Expansion (`lib/solver/expand.js`)

Before any assignment can happen, courses must be expanded into individual schedulable sessions. The expansion rule is:

- **Lecture** → one session per group (the entire group attends; `groups_covered = [G1, G2, ...]` if the course covers multiple groups, `subgroup = null`)
- **Tutorial / Lab** → one session per subgroup (each subgroup is scheduled independently; `subgroup = "G1-1"`, `groups_covered = ["G1"]`)

Sessions are also partitioned by level, since each level is solved independently. This is done in `expandByLevel()`, which returns a `Map<level, session[]>`.

### 7.2 Phase 1 — Domain Building (`lib/solver/domains.js`)

For each session, a **domain** is computed: the set of all (day, period, room) triples that are valid candidates before any conflict checking. Domain trimming applies two hard constraints:

- **HC-10 (Staff Availability):** Slots on days the instructor is not available are excluded. If the staff member has no availability data, all days are open.
- **HC-8 (Session Duration):** Multi-period sessions (duration > slot length) cannot start in a period that would run past the last period of the day.

If a session's domain is empty after trimming, it is added to the `infeasible[]` list. The solver then retries with relaxed availability (all campus working days open for everyone) and reports which levels were relaxed.

Room assignment at the domain level is based on session type:

- `lecture` → `LECTURE_HALLS` (from `lib/rooms.js`)
- `tutorial` → `TUTORIAL_ROOMS`
- `lab` → `LAB_ROOMS`

### 7.3 Phase 2 — Greedy Assignment + Conflict Repair (`lib/solver/backtrack.js`)

#### Greedy Pass

Sessions are sorted by **most constrained first** (smallest domain), with lectures prioritised over tutorials/labs within the same domain size. The solver iterates through the sorted list and places each session into its highest-scoring conflict-free slot.

Conflict detection is O(1) per slot via a `slotIndex` map keyed on `"day|period"`. Three hard constraints are checked:

- **HC-1 (Room Conflict):** Two sessions cannot share the same room in the same slot.
- **HC-2 (Staff Conflict):** The same instructor cannot teach two sessions simultaneously.
- **HC-3/4 (Group/Subgroup Conflict):** A subgroup cannot attend two sessions at the same time. A subgroup's lecture and tutorial cannot overlap.

Slot scoring (`scoreCandidate()`) implements a day-compaction heuristic:

| Condition | Score delta |
|---|---|
| Slot is on a day this unit already uses | −30 |
| Slot is adjacent to an existing session | −20 |
| New campus day, within target (≤4 days) | +20 × dayCount |
| New campus day, exceeds target | +100 × excess days |
| New day already used by sibling subgroup | −10 |

#### Conflict Repair Pass

Sessions that could not be placed in the greedy pass undergo a repair phase. For each unassigned session, the solver:

1. Attempts direct placement (slots may have freed up during earlier repairs).
2. Identifies blocking sessions in candidate slots.
3. Attempts to **swap** a blocker to one of its own alternative slots, then places the unassigned session.

The repair phase runs up to `maxAttempts = 100` swap attempts per session.

#### Restarts

The full greedy + repair cycle runs up to `maxRestarts = 3` times with randomised session ordering after the first attempt. The best result (most sessions placed) is kept.

### 7.4 Phase 3 — Simulated Annealing Polish (`lib/solver/anneal.js`)

After the greedy phase produces a feasible (or near-feasible) assignment, a simulated annealing post-processor runs to improve schedule quality by minimising soft constraint cost.

**Cost function** (`computeCost()` in `lib/solver/cost.js`):

| Term | Weight | Purpose |
|---|---|---|
| Campus days per unit | 50 | Base penalty per day a student/subgroup must come to campus |
| Days exceeding 4 | 200 | Heavy penalty — target is ≤4 campus days per week |
| Idle period gaps per day | 15 | Penalise gaps between sessions on the same day |

**Move types** (each iteration randomly selects one):

- **Relocate (60%):** Move a session to a different slot on a day the unit already uses, or any other valid slot. Strongly biased toward already-occupied days.
- **Swap (40%):** Exchange two sessions of the same type to reduce total cost.

Both move types re-validate hard constraints before acceptance. The Metropolis acceptance criterion allows uphill moves with probability `exp(-Δcost / temperature)`, enabling escape from local minima.

**Budget:** `max(1000ms, min(4000ms, sessions.length × 3ms))`, capped at 4 seconds per level.

**Cooling:** Geometric decay at rate 0.998 per iteration. Initial temperature 2.0 — chosen to accept moderate uphill moves (~10% of cost) with ~37% probability at the start.

### 7.5 Cross-Level Staff Conflict Prevention

Each level is solved sequentially, not in parallel. A `globalSlotIndex` is passed through all levels. When level N is solved, all sessions from levels 1…N-1 already in the slot index prevent the greedy solver from double-booking a professor who teaches across levels.

### 7.6 Job Lifecycle

```
POST /api/coordinator/schedule/generate
  → Insert schedule_job { status: "running" }
  → Return { jobId } immediately
  → [background] runSolver()
      → deleteMany existing schedules for this term
      → for each level: expand → domain → solve → anneal
      → insertOne schedule document per level
      → updateOne schedule_job { status: "completed", stats }
  
GET /api/coordinator/schedule/generate?jobId=...
  → findOne schedule_jobs
  → Return { status, statusMessage, stats }
```

---

## 8. Distributed Systems Analysis

### 8.1 Stateless Scalability

The API layer is fully stateless. Any instance can serve any request: identity is in the JWT, institution context is in the database. Horizontal scaling requires only adding more Node.js/Vercel instances behind a load balancer.

### 8.2 Edge-Origin Separation

The middleware runs in a geographically distributed Edge Runtime. JWT verification, route protection, and request tagging all happen at the CDN edge — reducing latency and offloading work from the origin. This is a genuine distributed systems property: access control is enforced at the perimeter, not just the origin.

### 8.3 Async Job Model

The fire-and-poll job pattern decouples the HTTP response time from solver execution time. The client receives an immediate acknowledgement and polls for completion. This is standard for distributed work queues (similar to AWS SQS + polling, or Celery with a result backend), implemented here using MongoDB as the state store.

**Trade-off:** The solver runs inside the same Node.js process as the API handlers. On Vercel, a serverless function instance is reused or recycled between invocations — there is no guarantee the background Promise completes if the function instance is recycled before the solver finishes. On a persistent Node.js server this is not an issue.

### 8.4 Idempotency

`POST /api/coordinator/schedule/generate` is **not idempotent**. Each call creates a new `schedule_job` document and deletes + regenerates all schedules for the active term. Duplicate calls from double-clicks or retries will trigger redundant solver runs. There is no deduplication guard (e.g., checking for an already-running job before inserting a new one).

### 8.5 Consistency Under Concurrent Writes

MongoDB provides no multi-document transaction guarantees in the current implementation. The critical section is:

```js
await db.collection("schedules").deleteMany({ institution_id, term_label });
// ← crash here leaves term with no schedule
await db.collection("schedules").insertOne({ ... });
```

If two coordinators at the same institution trigger generation simultaneously (unlikely but possible), their solver runs will race: both delete the existing schedule, then both write their results, leading to a mixed or corrupt schedule for the term.

Mitigation for MVP: the probability of concurrent generation is low (typically one coordinator per institution). A robust fix would use an optimistic lock (check-and-set on the job document) or a MongoDB transaction.

### 8.6 Rate Limiter Distribution Problem

The in-memory rate limiter in `lib/rate-limiter.js` is not distributed. On a multi-instance deployment, each instance maintains its own counter. A client can bypass the rate limit by routing requests to different instances (possible under a round-robin load balancer). This is documented in the findings audit (I-002) as a known improvement for production.

---

## 9. Limitations

### 9.1 Solver Completeness

The solver does not guarantee that all sessions are placed. If the constraint space is infeasible (too many courses for the available room+time combinations), the solver returns a partial schedule. There is no formal infeasibility proof or conflict explanation — only a count of unplaced sessions.

The simulated annealing phase operates on soft constraints only. It does not repair hard constraint violations — if a session is unassigned after the greedy+repair phase, SA cannot place it.

### 9.2 Room Assignment

Rooms are assigned by type (lecture hall, tutorial room, lab) from a static list in `lib/rooms.js`. There is no capacity check against group size, no handling of room-specific restrictions (`department`, `courseOnly`), and no preference for keeping a course's sessions in the same room. HC-6 (room type match) is enforced; HC-5 (room capacity) is not.

### 9.3 No Multi-Document Transactions

As noted in §8.5, the schedule write operation (delete then insert) is not atomic. A failure mid-way leaves the institution with no schedule for the active term. For a production system this should be wrapped in a MongoDB multi-document transaction.

### 9.4 Synchronous Solver in Serverless Context

The solver runs as an unawaited Promise inside the API route handler. On Vercel (serverless), the function instance may be recycled before the Promise resolves, causing the job to remain permanently in `status: "running"`. A proper fix is to run the solver in a separate long-lived worker process or use a managed queue (e.g., Vercel's Queue, AWS SQS + Lambda).

### 9.5 In-Memory Rate Limiting

The rate limiter is per-process and per-instance. It provides no protection on multi-instance deployments. A Redis or MongoDB TTL collection is needed for production.

### 9.6 Conflict Detection Coverage

`detectConflicts()` in `coordinatorService.js` checks for room and staff double-booking but does not check subgroup-level conflicts (HC-3, HC-4) or lecture+tutorial overlap for the same group. The review UI can therefore show a schedule as "no conflicts" when hidden subgroup conflicts exist.

### 9.7 Schedule Coverage Metric

The `coverage` statistic on the review page is computed as `sessions.length / (sessions.length + unresolvedConflicts.length)`. This does not represent true schedule completeness — it should be `assignedSessions / requiredSessions`. The current metric is misleading for schedules with all sessions placed but some room conflicts.

### 9.8 CSV Import Robustness

The CSV import routes use `row.split(",")` rather than a proper RFC 4180 parser. Fields containing commas or quotes (e.g., room names like "Hall, North Wing") will be parsed incorrectly. PapaParse is already a dependency and should be used instead.

---

## 10. Future Work

### 10.1 Persistent Worker for Solver Execution

Replace the unawaited-Promise pattern with a proper background worker. Options:

- **Vercel Queue** — managed serverless queue with guaranteed delivery
- **BullMQ + Redis** — battle-tested Node.js job queue with retry, progress reporting, and dead-letter handling
- **Separate Node.js solver service** — deploy the `lib/solver/` module as a dedicated microservice with a REST interface, restoring the architectural separation that previously existed with FastAPI

### 10.2 Distributed Rate Limiting

Replace the in-memory rate limiter with **Upstash Redis** (available on Vercel's Edge network). This provides rate limiting that is consistent across all function instances and works in the Edge Runtime.

### 10.3 MongoDB Transactions for Schedule Writes

Wrap the `deleteMany` + `insertOne` sequence in a MongoDB multi-document transaction:

```js
const session = client.startSession();
await session.withTransaction(async () => {
  await schedules.deleteMany({ institution_id, term_label }, { session });
  await schedules.insertMany(newScheduleDocs, { session });
});
```

This eliminates the inconsistency window between deletion and insertion.

### 10.4 Solver Improvements

- **HC-5 (Room Capacity):** Enforce room capacity ≥ group enrolment. Requires storing per-group student counts.
- **HC-6 (Room Restrictions):** Support `courseOnly` and `department` room restrictions from the room schema.
- **Better Infeasibility Reporting:** When a session cannot be placed, report which constraints are in conflict (e.g., "Professor X has no available slots on any day where room Y is free").
- **Parallel Level Solving:** Levels with no shared staff could be solved in parallel using `Promise.all()`, reducing total solver time.
- **Incremental Re-scheduling:** Allow rescheduling a single course or group without regenerating the entire term.

### 10.5 Coverage and Conflict Metrics

Fix the coverage denominator to use `requiredSessions` derived from course × group × session-type expansion. Extend `detectConflicts()` to check HC-3 and HC-4 (subgroup and lecture+tutorial overlap). Surface conflict explanations in the review UI (which sessions conflict, why, what would fix it).

### 10.6 Schedule Query Routes

Add `GET /api/schedule/level/[level]` and `GET /api/schedule/group/[groupId]` endpoints to support per-level and per-group timetable views. This enables more targeted student-facing views without loading the entire term schedule.

### 10.7 Multi-Tenancy Hardening

All coordinator routes already scope queries by `institution_id`. Additional hardening:

- Index `institution_id` on all high-read collections (courses, schedules, availability).
- Add a compound unique index on `schedules` (`institution_id`, `term_label`, `level`) to prevent duplicate level schedules from racing writes.
- Enforce a job deduplication check: if a job with `status: "running"` already exists for the institution and term, reject a new generate request.

---

## 11. Conclusion

Schedula delivers a complete academic timetabling system within a single Next.js application. Its architectural approach — stateless JWT-based identity, edge-enforced access control, async fire-and-poll job execution, and a three-phase solver (greedy assignment + conflict repair + simulated annealing) — provides a working, deployable system that scales horizontally without shared server-side state.

The solver correctly enforces the three most critical hard constraints (room exclusivity, instructor exclusivity, subgroup exclusivity) and meaningfully optimises the dominant soft constraint (minimising student campus days). The fire-and-poll pattern keeps the HTTP layer responsive while the solver runs for several seconds per level.

The honest limitations are in production hardening: the unawaited-Promise solver pattern is fragile on serverless, the rate limiter does not survive multi-instance deployment, the schedule write is not atomic, and room capacity is not enforced. These are appropriate trade-offs for an MVP — each has a clear and documented upgrade path.

The codebase is structured to support those upgrades: the solver is a pure, importable module (`lib/solver/`), the API layer is thin and consistent, and the data model is flexible enough to accommodate the missing constraint fields without a schema migration.
