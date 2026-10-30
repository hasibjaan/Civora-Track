import "server-only";

import { z } from "zod";

export interface EarthEngineConfig {
  /** A service-account key, as JSON, for a Cloud project registered with Earth Engine. */
  key: string;
  /** The Google Cloud project ID registered with Earth Engine. */
  project: string;
}

const ServiceAccountKeySchema = z.object({
  client_email: z.string().min(1),
  private_key: z.string().min(1),
});

/** Sentinel-2 surface reflectance, harmonized across processing versions. */
const SENTINEL_2 = "COPERNICUS/S2_SR_HARMONIZED";
const LOOKBACK_DAYS = 90;
const MAX_CLOUDY_PERCENT = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Natural colour: red, green and blue bands, stretched for typical surface reflectance. */
const TRUE_COLOUR = { bands: ["B4", "B3", "B2"], min: 0, max: 3000 };

/**
 * Asks Earth Engine for a recent, mostly cloud-free true-colour composite and returns its
 * tile URL template. Earth Engine renders each tile on request, so only the area being
 * viewed is ever computed. This is satellite imagery from the last few months, not a live
 * camera feed.
 */
export async function requestSentinelTileUrl(
  config: EarthEngineConfig,
  now: Date,
): Promise<string> {
  const key = ServiceAccountKeySchema.parse(JSON.parse(config.key));
  // Loaded only when imagery is configured, so the large client is never loaded otherwise.
  const ee = (await import("@google/earthengine")).default;

  await new Promise<void>((resolve, reject) =>
    ee.data.authenticateViaPrivateKey(key, resolve, (error) => reject(asError(error))),
  );
  await new Promise<void>((resolve, reject) =>
    ee.initialize(null, null, resolve, (error) => reject(asError(error)), null, config.project),
  );

  const start = new Date(now.getTime() - LOOKBACK_DAYS * MS_PER_DAY);
  const composite = ee
    .ImageCollection(SENTINEL_2)
    .filterDate(isoDate(start), isoDate(now))
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", MAX_CLOUDY_PERCENT))
    .median();

  return new Promise((resolve, reject) =>
    composite.getMapId(TRUE_COLOUR, (mapId, error) => {
      if (mapId?.urlFormat) resolve(mapId.urlFormat);
      else reject(new Error(error ?? "Earth Engine returned no map."));
    }),
  );
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
