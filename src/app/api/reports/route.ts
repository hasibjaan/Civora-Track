import { NextResponse } from "next/server";

import { analyzeSubmission } from "@/ai";
import { submitReport } from "@/application/submit-report";
import { photoStore, reportRepository } from "@/data";
import { InvalidPhotoError } from "@/data/photos";
import { createReportId } from "@/domain/report";
import { MAX_IMAGE_DATA_URL_LENGTH, NewReportSchema } from "@/domain/schemas";
import { BodyTooLargeError, readJsonBody } from "@/lib/request-body";
import { createRateLimiter } from "@/lib/rate-limit";
import { toFieldErrors } from "@/lib/validation";

const MAX_REQUEST_BYTES = MAX_IMAGE_DATA_URL_LENGTH + 8 * 1024;
const submissionLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/** Creates a report from a citizen submission and returns its tracking ID. */
export async function POST(request: Request) {
  const limit = submissionLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return errorResponse(
      429,
      "Too many reports from this device. Please wait a few minutes and try again.",
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  // A cross-site HTML form can only send text/plain or form data, and cannot send JSON without
  // a preflight check the browser would refuse. Requiring JSON stops such forms posting reports.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return errorResponse(415, "Send the report as JSON.");
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return errorResponse(413, "The submission is too large. Try a smaller photo.");
    }
    return errorResponse(400, "The request body must be JSON.");
  }

  const parsed = NewReportSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "Please fix the highlighted fields.", undefined, {
      fieldErrors: toFieldErrors(parsed.error.issues),
    });
  }

  try {
    const report = await submitReport(parsed.data, {
      reports: reportRepository,
      photos: photoStore,
      analyze: analyzeSubmission,
      createId: createReportId,
      now: () => new Date(),
    });
    return NextResponse.json({ id: report.id }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidPhotoError) {
      return errorResponse(400, "Please fix the highlighted fields.", undefined, {
        fieldErrors: { imageUrl: error.message },
      });
    }
    // Log the error server-side only. The client gets a generic message.
    console.error("Report submission failed.", error);
    return errorResponse(500, "We could not save your report. Please try again.");
  }
}

/** Identifies the sender for rate limiting. Behind a proxy this is the first forwarded address. */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "anonymous";
}

function errorResponse(
  status: number,
  error: string,
  headers?: Record<string, string>,
  extra?: { fieldErrors?: Record<string, string> },
) {
  return NextResponse.json({ error, ...extra }, { status, headers });
}
