import { NextResponse } from "next/server";

import { photoStore, reportRepository } from "@/data";
import { TRACKING_ID_PATTERN } from "@/domain/schemas";

/** Serves the photo attached to a report. Anyone with the tracking ID can view it. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!TRACKING_ID_PATTERN.test(id)) return new NextResponse(null, { status: 404 });

  const report = await reportRepository.get(id);
  if (!report?.photo) return new NextResponse(null, { status: 404 });

  const bytes = await photoStore.read(id, report.photo.mimeType);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": report.photo.mimeType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
