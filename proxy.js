import { NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/edge-auth";

/**
 * proxy.js
 * Role-based route protection with JWT token verification.
 * Public routes bypass auth. Protected routes require valid token and role.
 */

// Routes that don't require authentication
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

// Role-based route mapping
const PROTECTED_ROUTES = {
  "/coordinator": ["coordinator"],
  "/staff": ["professor", "ta"], // Staff includes professors and TAs
  "/student": ["student"],
  "/onboarding": ["coordinator", "professor", "ta", "student"],
};

function withRequestId(response) {
  // Add a correlation ID for every proxied response.
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

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes (they handle their own auth)
  if (pathname.startsWith("/api/")) {
    return withRequestId(NextResponse.next());
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return withRequestId(NextResponse.next());
  }

  // Check if bypass auth is enabled for development
  if (process.env.BYPASS_AUTH === "true") {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id",    process.env.BYPASS_AUTH_USER_ID    || "666666666666666666666601");
    requestHeaders.set("x-user-role",  process.env.BYPASS_AUTH_USER_ROLE  || "coordinator");
    requestHeaders.set("x-user-email", process.env.BYPASS_AUTH_USER_EMAIL || "coordinator@demo.local");
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // Get required roles for protected route
  const requiredRoles = getRequiredRoles(pathname);
  if (!requiredRoles) {
    // Route doesn't match any protected pattern, allow it
    return withRequestId(NextResponse.next());
  }

  // Extract and verify token
  const authToken = request.cookies.get("auth_token")?.value;

  if (!authToken) {
    // No token — redirect to signin, preserving destination
    const url = new URL("/signin", request.url);
    url.searchParams.set("redirect", pathname);
    return withRequestId(NextResponse.redirect(url));
  }

  const payload = await verifyTokenEdge(authToken);

  if (!payload) {
    // Invalid or expired token — redirect to signin, preserving destination
    const url = new URL("/signin", request.url);
    url.searchParams.set("redirect", pathname);
    return withRequestId(NextResponse.redirect(url));
  }

  // Cross-role guard: prevent users from accessing routes outside their role
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

  // Token valid and role matches — allow request
  // Attach user info to request (via header) for optional use in API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-institution", payload.institution ?? "");

  return withRequestId(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
  );
}

export const config = {
  // Match all routes except public assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
