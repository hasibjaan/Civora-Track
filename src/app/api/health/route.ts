import { NextResponse } from "next/server";

import { storageKind } from "@/data";

// Simple liveness check, useful for confirming a deployment during demos. `storage` says
// whether reports are shared through Supabase ("supabase") or kept on this server ("files").
export function GET() {
  return NextResponse.json({
    status: "ok",
    storage: storageKind,
    timestamp: new Date().toISOString(),
  });
}
