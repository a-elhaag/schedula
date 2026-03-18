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
  "/onboarding",
  "/unauthorized",
  "/api/auth",
];

// Role-based route mapping
const PROTECTED_ROUTES = {
  "/coordinator": ["coordinator"],
  "/staff": ["professor", "ta"], // Staff includes professors and TAs
  "/student": ["student"],
};

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

  // Skip API routes (they handle their own auth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get required roles for protected route
  const requiredRoles = getRequiredRoles(pathname);
  if (!requiredRoles) {
    // Route doesn't match any protected pattern, allow it
    return NextResponse.next();
  }

  // Extract and verify token
  const authToken = request.cookies.get("auth_token")?.value;

  if (!authToken) {
    // No token — redirect to signin
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const payload = await verifyTokenEdge(authToken);

  if (!payload) {
    // Invalid or expired token — redirect to signin
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // Check role
  if (!requiredRoles.includes(payload.role)) {
    // User doesn't have required role
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Token valid and role matches — allow request
  // Attach user info to request (via header) for optional use in API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Match all routes except public assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
