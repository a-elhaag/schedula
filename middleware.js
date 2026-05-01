// middleware.js
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
