import { describe, expect, it } from "vitest";

import { BodyTooLargeError, readJsonBody } from "@/lib/request-body";
import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  function clock(start = 0) {
    let time = start;
    return {
      now: () => time,
      advance: (ms: number) => {
        time += ms;
      },
    };
  }

  it("allows up to the limit, then refuses with a retry time", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: time.now });

    expect(limiter.check("ip-1")).toEqual({ allowed: true });
    expect(limiter.check("ip-1")).toEqual({ allowed: true });
    expect(limiter.check("ip-1")).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("allows requests again once the window has passed", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: time.now });
    limiter.check("ip-1");

    time.advance(60_000);

    expect(limiter.check("ip-1")).toEqual({ allowed: true });
  });

  it("tracks each key separately", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: time.now });
    limiter.check("ip-1");

    expect(limiter.check("ip-2")).toEqual({ allowed: true });
  });
});

describe("readJsonBody", () => {
  it("parses a small JSON body", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
    });

    await expect(readJsonBody(request, 1024)).resolves.toEqual({ hello: "world" });
  });

  it("refuses a body whose declared length is over the limit", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-length": "5000" },
      body: "{}",
    });

    await expect(readJsonBody(request, 1024)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("refuses a streamed body that grows past the limit, even with no declared length", async () => {
    const chunk = new TextEncoder().encode("x".repeat(600));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);

    await expect(readJsonBody(request, 1000)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("rejects text that is not JSON", async () => {
    const request = new Request("http://localhost/api", { method: "POST", body: "nope" });

    await expect(readJsonBody(request, 1024)).rejects.toBeInstanceOf(SyntaxError);
  });
});
