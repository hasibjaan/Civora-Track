import "server-only";

import { headers } from "next/headers";

import { isAuthorized, officerCredentials } from "./basic-auth";

/**
 * The signed-in officer's username, or null when the request is not signed in. Every officer
 * server action calls this, so a request is checked even if the proxy's path rules do not
 * apply to it.
 */
export async function signedInOfficer(): Promise<string | null> {
  const expected = officerCredentials();
  if (!expected) return null;

  const header = (await headers()).get("authorization");
  return isAuthorized(header, expected) ? expected.username : null;
}
