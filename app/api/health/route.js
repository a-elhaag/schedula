import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request) {
  const requestId = request.headers.get("x-request-id") || "unknown";

  try {
    const db = await getDb();

    // Test database connection with a simple ping
    await db.admin().ping();

    logger.info(
      { requestId },
      "Health check passed - database connection OK",
    );

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "ok",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error(
      { requestId, error: error.message },
      "Health check failed - database connection error",
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "error",
        },
        error: error.message,
      },
      { status: 503 },
    );
  }
}
