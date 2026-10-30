export interface Credentials {
  username: string;
  password: string;
}

/** Shorter passwords are refused outright, so the officer area is never open with a weak one. */
export const ADMIN_PASSWORD_MIN_LENGTH = 12;

/**
 * The officer login from the environment, or null when no password of adequate length is
 * configured. A null result means the officer area must refuse everything.
 */
export function officerCredentials(
  env: Record<string, string | undefined> = process.env,
): Credentials | null {
  const password = env.ADMIN_PASSWORD ?? "";
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) return null;
  return { username: env.ADMIN_USERNAME ?? "officer", password };
}

/**
 * Checks an HTTP Basic Authorization header against the expected credentials.
 * Both fields are compared in constant time, so response timing does not reveal
 * how much of a password matched.
 */
export function isAuthorized(authorizationHeader: string | null, expected: Credentials): boolean {
  const supplied = parseBasicCredentials(authorizationHeader);
  if (!supplied) return false;

  // Compare both fields even if the first one fails, so timing does not reveal which one.
  const usernameMatches = constantTimeEqual(supplied.username, expected.username);
  const passwordMatches = constantTimeEqual(supplied.password, expected.password);
  return usernameMatches && passwordMatches;
}

function parseBasicCredentials(header: string | null): Credentials | null {
  if (!header?.startsWith("Basic ")) return null;

  // atob gives one character per byte. Decode those bytes as UTF-8 so that passwords with
  // accented or non-Latin characters match the configured text.
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(header.slice("Basic ".length)), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
  const decoded = new TextDecoder().decode(bytes);

  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);

  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
