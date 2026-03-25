import { verifyToken } from "@/lib/jwt";

/**
 * Extracts and verifies the current user from the incoming API request.
 *
 * Resolution order:
 *   1. Check if BYPASS_AUTH is enabled (dev mode)
 *      - Uses x-user-id header if provided, falls back to BYPASS_AUTH_USER_* env vars
 *   2. x-user-id / x-user-role / x-user-institution headers injected by middleware
 *      (fast path — token was already verified at the edge)
 *   3. auth_token httpOnly cookie (direct API calls that bypass middleware)
 *
 * @param {Request} request
 * @param {{ requiredRole?: string | string[] }} [options]
 * @returns {{ userId: string, email: string, role: string, institutionId: string }}
 * @throws {{ status: number, message: string }} on auth failure
 */
export function getCurrentUser(request, { requiredRole } = {}) {
  // ── Dev bypass mode: skip token verification ────────────────────────────────
  const bypassAuth = process.env.BYPASS_AUTH === "true";

  if (bypassAuth) {
    // Try to get user info from headers first, fall back to env vars
    const headerId = request.headers.get("x-user-id");
    const headerRole = request.headers.get("x-user-role");
    const headerEmail = request.headers.get("x-user-email");
    const headerInstitution = request.headers.get("x-user-institution");

    const userId =
      headerId || process.env.BYPASS_AUTH_USER_ID || "demo-user-001";
    const role =
      headerRole || process.env.BYPASS_AUTH_USER_ROLE || "coordinator";
    const email =
      headerEmail || process.env.BYPASS_AUTH_USER_EMAIL || "dev@local";
    const institutionId = headerInstitution || "demo-institution";

    // Still check requiredRole even in bypass mode
    if (requiredRole) {
      const allowed = Array.isArray(requiredRole)
        ? requiredRole
        : [requiredRole];
      if (!allowed.includes(role)) {
        const err = new Error("Forbidden. Insufficient permissions.");
        err.status = 403;
        throw err;
      }
    }

    return { userId, email, role, institutionId };
  }

  // ── Fast path: headers injected by middleware ────────────────────────────────
  const headerId = request.headers.get("x-user-id");
  const headerRole = request.headers.get("x-user-role");
  const headerEmail = request.headers.get("x-user-email");
  const headerInstitution = request.headers.get("x-user-institution");

  let userId, role, email, institutionId;

  if (headerId && headerRole) {
    userId = headerId;
    role = headerRole;
    email = headerEmail ?? "";
    institutionId = headerInstitution ?? "";
  } else {
    // ── Cookie fallback: verify JWT directly ─────────────────────────────────
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    const rawToken = match ? decodeURIComponent(match[1]) : null;

    if (!rawToken) {
      const err = new Error("Unauthorized.");
      err.status = 401;
      throw err;
    }

    const payload = verifyToken(rawToken);

    if (!payload) {
      const err = new Error("Session expired. Please sign in again.");
      err.status = 401;
      throw err;
    }

    userId = payload.sub;
    role = payload.role;
    email = payload.email ?? "";
    institutionId = payload.institution ?? "";
  }

  // ── Role enforcement ─────────────────────────────────────────────────────────
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(role)) {
      const err = new Error("Forbidden. Insufficient permissions.");
      err.status = 403;
      throw err;
    }
  }

  return { userId, email, role, institutionId };
}
