import { describe, expect, it } from "vitest";

import { ADMIN_PASSWORD_MIN_LENGTH, isAuthorized, officerCredentials } from "@/lib/basic-auth";
import { createRateLimiter } from "@/lib/rate-limit";

function basic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

describe("officer password handling", () => {
  it("accepts a password with accented and non-Latin characters", () => {
    const expected = { username: "officer", password: "pässwörd-ünïcode-123" };

    expect(isAuthorized(basic("officer", "pässwörd-ünïcode-123"), expected)).toBe(true);
    expect(isAuthorized(basic("officer", "passwort-unicode-123"), expected)).toBe(false);
  });

  it("refuses to configure a password shorter than the minimum length", () => {
    const short = "x".repeat(ADMIN_PASSWORD_MIN_LENGTH - 1);

    expect(officerCredentials({ ADMIN_PASSWORD: short })).toBeNull();
  });

  it("uses the officer username by default, and the configured one when given", () => {
    const password = "x".repeat(ADMIN_PASSWORD_MIN_LENGTH);

    expect(officerCredentials({ ADMIN_PASSWORD: password })?.username).toBe("officer");
    expect(
      officerCredentials({ ADMIN_PASSWORD: password, ADMIN_USERNAME: "duty-officer" })?.username,
    ).toBe("duty-officer");
  });
});

describe("rate limiter memory", () => {
  it("never tracks more keys than its limit, so a flood of new keys cannot exhaust memory", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });

    for (let index = 0; index < 10_500; index++) {
      limiter.check(`client-${index}`);
    }

    // The earliest key was forgotten, so it is allowed again rather than refused.
    expect(limiter.check("client-0")).toEqual({ allowed: true });
  });
});
