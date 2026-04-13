import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const ROLE_REDIRECTS = {
  coordinator: "/coordinator/setup",
  professor:   "/staff/schedule",
  ta:          "/staff/schedule",
  student:     "/student/schedule",
};

function getSecret() {
  const raw = process.env.JWT_SECRET ?? "dev-secret-key-change-in-prod";
  return new TextEncoder().encode(raw);
}

async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token   = request.cookies.get("auth_token")?.value;
  const payload = await verifySession(token);

  // ── Protected pages: no valid session → sign-in ────────────────────────────
  const isProtected =
    pathname.startsWith("/coordinator") ||
    pathname.startsWith("/student")     ||
    pathname.startsWith("/staff");

  if (isProtected && !payload) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ── Already-authenticated users: skip signin/signup/landing ────────────────
  const isAuthRoute =
    pathname === "/" ||
    pathname === "/signin" ||
    pathname === "/signup";

  if (isAuthRoute && payload) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_REDIRECTS[payload.role] ?? "/coordinator/setup";
    return NextResponse.redirect(url);
  }

  // ── Role guard: prevent cross-role page access ─────────────────────────────
  if (payload) {
    const role = payload.role;
    if (pathname.startsWith("/coordinator") && role !== "coordinator") {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_REDIRECTS[role] ?? "/unauthorized";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/student") && role !== "student") {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_REDIRECTS[role] ?? "/unauthorized";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/staff") && !["professor", "ta"].includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_REDIRECTS[role] ?? "/unauthorized";
      return NextResponse.redirect(url);
    }
  }

  // ── Inject user headers for downstream API routes (fast path) ──────────────
  if (payload) {
    const response = NextResponse.next();
    response.headers.set("x-user-id",          payload.sub          ?? "");
    response.headers.set("x-user-role",         payload.role         ?? "");
    response.headers.set("x-user-email",        payload.email        ?? "");
    response.headers.set("x-user-institution",  payload.institution  ?? "");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/signin",
    "/signup",
    "/coordinator/:path*",
    "/student/:path*",
    "/staff/:path*",
  ],
};
