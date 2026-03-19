import { NextResponse } from "next/server";

export function jsonOk(data, init = {}) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function jsonError(message, status = 500, details) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

export function withApiErrorHandling(handler) {
  return async function wrappedHandler(request, context) {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error("API error:", error);
      return jsonError("Internal server error", 500);
    }
  };
}
