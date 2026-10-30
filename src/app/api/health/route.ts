import { NextResponse } from "next/server";

// Simple liveness check. Useful for confirming the deployed app is up during demos.
export function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
