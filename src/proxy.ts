import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_PASSWORD_MIN_LENGTH, isAuthorized, officerCredentials } from "@/lib/basic-auth";

const NO_STORE = "no-store";

/**
 * Guards the officer area. Citizen reports are personal data, so every officer route
 * requires credentials. Fails closed: with no sufficiently strong password configured,
 * the officer area refuses all requests.
 */
export function proxy(request: NextRequest) {
  const expected = officerCredentials();
  if (!expected) {
    return new NextResponse(
      `The officer area is locked. Set ADMIN_PASSWORD to at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`,
      { status: 503, headers: { "Cache-Control": NO_STORE } },
    );
  }

  if (isAuthorized(request.headers.get("authorization"), expected)) {
    return NextResponse.next();
  }

  return new NextResponse("Sign in to open the officer area.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Officer area", charset="UTF-8"',
      "Cache-Control": NO_STORE,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
