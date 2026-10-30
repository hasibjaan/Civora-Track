import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

const PASSWORD = "a-long-enough-password";

function request(authorization?: string): NextRequest {
  const headers = authorization ? { authorization } : undefined;
  return new NextRequest("http://localhost/admin", { headers });
}

function basic(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

describe("officer area gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("locks the area when no password is configured", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const response = proxy(request(basic("officer", PASSWORD)));

    expect(response.status).toBe(503);
  });

  it("refuses a password shorter than twelve characters", () => {
    vi.stubEnv("ADMIN_PASSWORD", "short");

    const response = proxy(request(basic("officer", "short")));

    expect(response.status).toBe(503);
  });

  it("asks for credentials when none are sent, with a no-store header", () => {
    vi.stubEnv("ADMIN_PASSWORD", PASSWORD);

    const response = proxy(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects wrong credentials", () => {
    vi.stubEnv("ADMIN_PASSWORD", PASSWORD);

    expect(proxy(request(basic("officer", "not-the-password"))).status).toBe(401);
  });

  it("lets the request through when the credentials match", () => {
    vi.stubEnv("ADMIN_PASSWORD", PASSWORD);

    const response = proxy(request(basic("officer", PASSWORD)));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
