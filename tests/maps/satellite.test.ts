import { afterEach, describe, expect, it, vi } from "vitest";

import { requestSentinelTileUrl } from "@/maps/earth-engine";
import { createSatelliteSource, SATELLITE_ATTRIBUTION } from "@/maps/satellite";

const TEMPLATE = "https://earthengine.googleapis.com/v1/projects/demo/maps/abc/tiles/{z}/{x}/{y}";

describe("createSatelliteSource", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns no layer when satellite imagery is not configured", async () => {
    const source = createSatelliteSource({ request: null });

    expect(await source.layer()).toBeNull();
  });

  it("returns the tile template with attribution when Earth Engine answers", async () => {
    const source = createSatelliteSource({ request: async () => TEMPLATE });

    expect(await source.layer()).toEqual({
      urlTemplate: TEMPLATE,
      attribution: SATELLITE_ATTRIBUTION,
    });
  });

  it("reuses the layer until it expires, so dashboard loads do not each call Earth Engine", async () => {
    let time = 0;
    const request = vi.fn(async () => TEMPLATE);
    const source = createSatelliteSource({ request, ttlMs: 1000, now: () => time });

    await source.layer();
    await source.layer();
    expect(request).toHaveBeenCalledTimes(1);

    time = 1500;
    await source.layer();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("shares one request between pages that load at the same moment", async () => {
    const request = vi.fn(async () => TEMPLATE);
    const source = createSatelliteSource({ request });

    await Promise.all([source.layer(), source.layer(), source.layer()]);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("falls back to the street map on failure, and waits before trying again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let time = 0;
    const request = vi.fn(async (): Promise<string> => {
      throw new Error("permission denied");
    });
    const source = createSatelliteSource({ request, retryAfterMs: 1000, now: () => time });

    expect(await source.layer()).toBeNull();
    expect(await source.layer()).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);

    time = 1500;
    await source.layer();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("never logs the error message, which could contain paths or credentials", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const source = createSatelliteSource({
      request: async () => {
        throw new Error("/secret/path/key.json is invalid");
      },
    });

    await source.layer();

    expect(JSON.stringify(warn.mock.calls)).not.toContain("/secret/path");
  });
});

describe("requestSentinelTileUrl", () => {
  it("rejects a key that is not a service-account key", async () => {
    const key = JSON.stringify({ hello: "world" });

    await expect(
      requestSentinelTileUrl({ key, project: "demo-project" }, new Date()),
    ).rejects.toThrow();
  });

  it("rejects a service-account key whose private key is not valid, through the real client", async () => {
    const key = JSON.stringify({
      client_email: "demo@demo.iam.gserviceaccount.com",
      private_key: "not-a-key",
    });

    await expect(
      requestSentinelTileUrl({ key, project: "demo-project" }, new Date()),
    ).rejects.toThrow();
  }, 20_000);
});
