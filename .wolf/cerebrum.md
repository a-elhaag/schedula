# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-05-01

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Project:** schedula
- **lib/auth.js exports:** `signToken`, `verifyToken`, `generateToken` only — NOT `hashPassword`. Always import `hashPassword` and `comparePassword` from `@/lib/password`.
- **Next.js middleware:** Must be named `middleware.js` at the project root with an export named `middleware`. Any other filename (e.g., `proxy.js`) is silently ignored by the framework.
- **resolveInstitutionId:** Used throughout coordinator API routes to handle both real ObjectId strings and BYPASS_AUTH string IDs. Always call `await resolveInstitutionId(institutionId)` instead of `new ObjectId(institutionId)` in coordinator routes.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

- [2026-05-01] Never import `hashPassword` from `@/lib/auth` — it only exists in `@/lib/password`.
- [2026-05-01] Never use `new ObjectId(institutionId)` directly in coordinator routes — always use `await resolveInstitutionId(institutionId)` to correctly handle BYPASS_AUTH and real ObjectIds.

## Decision Log

- [2026-05-01] Renamed proxy.js → middleware.js: Next.js requires the exact filename `middleware.js` at the project root. The old `proxy.js` was completely ignored by the framework.

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
