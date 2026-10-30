/** A map layer of satellite imagery, ready for the map to draw. */
export interface SatelliteLayer {
  /** Tile URL template with {z}, {x} and {y} placeholders. */
  urlTemplate: string;
  attribution: string;
}

export const SATELLITE_ATTRIBUTION =
  'Imagery: <a href="https://earthengine.google.com">Google Earth Engine</a>, contains modified Copernicus Sentinel-2 data';

export interface SatelliteSourceOptions {
  /** Requests a fresh tile URL template. Null when satellite imagery is not configured. */
  request: (() => Promise<string>) | null;
  /** How long a tile URL is reused before a new one is requested. */
  ttlMs?: number;
  /** After a failure, how long to show the street map before trying again. */
  retryAfterMs?: number;
  now?: () => number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const DEFAULT_RETRY_AFTER_MS = 5 * 60 * 1000;

/**
 * Supplies the satellite layer for the officer map. Requests are shared and cached, so many
 * dashboard loads cost one Earth Engine call. Any failure returns null, and the map shows
 * the street map instead, so imagery can never break the dashboard.
 */
export function createSatelliteSource({
  request,
  ttlMs = DEFAULT_TTL_MS,
  retryAfterMs = DEFAULT_RETRY_AFTER_MS,
  now = Date.now,
}: SatelliteSourceOptions) {
  let cached: { layer: SatelliteLayer; expiresAt: number } | undefined;
  let failedUntil = 0;
  let pending: Promise<SatelliteLayer | null> | undefined;

  async function fetchLayer(requestUrl: () => Promise<string>): Promise<SatelliteLayer | null> {
    try {
      const layer = { urlTemplate: await requestUrl(), attribution: SATELLITE_ATTRIBUTION };
      cached = { layer, expiresAt: now() + ttlMs };
      return layer;
    } catch (error) {
      failedUntil = now() + retryAfterMs;
      // Log the failure type only. Credentials and paths stay out of the logs.
      console.warn(
        "Satellite imagery unavailable, showing the street map.",
        error instanceof Error ? error.name : "unknown error",
      );
      return null;
    } finally {
      pending = undefined;
    }
  }

  return {
    layer(): Promise<SatelliteLayer | null> {
      if (!request) return Promise.resolve(null);
      if (cached && cached.expiresAt > now()) return Promise.resolve(cached.layer);
      if (now() < failedUntil) return Promise.resolve(null);

      pending ??= fetchLayer(request);
      return pending;
    },
  };
}
