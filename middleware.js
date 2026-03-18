import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export function middleware(request) {
  // Generate unique request ID for tracking
  const requestId = randomUUID();

  // Add request ID to response headers for correlation
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  return response;
}

// Apply middleware to all routes
export const config = {
  matcher: ["/:path*"],
};
