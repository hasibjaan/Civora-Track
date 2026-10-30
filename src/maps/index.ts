import "server-only";

import { requestSentinelTileUrl } from "./earth-engine";
import { createSatelliteSource, type SatelliteLayer } from "./satellite";

const keyFile = process.env.GOOGLE_EARTH_ENGINE_KEY_FILE;
const project = process.env.GOOGLE_EARTH_ENGINE_PROJECT;

const source = createSatelliteSource({
  request:
    keyFile && project ? () => requestSentinelTileUrl({ keyFile, project }, new Date()) : null,
});

/** The satellite layer for the officer map, or null to show the street map only. */
export function satelliteLayer(): Promise<SatelliteLayer | null> {
  return source.layer();
}
