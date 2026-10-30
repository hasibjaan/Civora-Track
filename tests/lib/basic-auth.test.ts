import { describe, expect, it } from "vitest";

import { constantTimeEqual, isAuthorized } from "@/lib/basic-auth";

const EXPECTED = { username: "officer", password: "correct-horse-battery" };

function basic(credentials: string): string {
  return `Basic ${btoa(credentials)}`;
}

describe("isAuthorized", () => {
  it("accepts the right username and password", () => {
    expect(isAuthorized(basic("officer:correct-horse-battery"), EXPECTED)).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(isAuthorized(basic("officer:wrong-password-here"), EXPECTED)).toBe(false);
  });

  it("rejects a wrong username", () => {
    expect(isAuthorized(basic("admin:correct-horse-battery"), EXPECTED)).toBe(false);
  });

  it("rejects a request with no credentials", () => {
    expect(isAuthorized(null, EXPECTED)).toBe(false);
  });

  it("rejects a different authentication scheme", () => {
    expect(isAuthorized("Bearer abc123", EXPECTED)).toBe(false);
  });

  it("rejects malformed encoding and a missing separator", () => {
    expect(isAuthorized("Basic !!!not-base64!!!", EXPECTED)).toBe(false);
    expect(isAuthorized(basic("officer-no-colon"), EXPECTED)).toBe(false);
  });

  it("allows colons inside the password", () => {
    const expected = { username: "officer", password: "pa:ss:word-long" };

    expect(isAuthorized(basic("officer:pa:ss:word-long"), expected)).toBe(true);
  });
});

describe("constantTimeEqual", () => {
  it("is true only for identical strings", () => {
    expect(constantTimeEqual("secret", "secret")).toBe(true);
    expect(constantTimeEqual("secret", "secreT")).toBe(false);
  });

  it("is false when lengths differ, including when one is a prefix of the other", () => {
    expect(constantTimeEqual("secret", "secret!")).toBe(false);
    expect(constantTimeEqual("secret!", "secret")).toBe(false);
  });
});
