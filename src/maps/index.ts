import "server-only";

import { readFile } from "node:fs/promises";

import { requestSentinelTileUrl } from "./earth-engine";
import { createSatelliteSource, type SatelliteLayer } from "./satellite";

const project = process.env.GOOGLE_EARTH_ENGINE_PROJECT;
const inlineKey = process.env.GOOGLE_EARTH_ENGINE_KEY;
const keyFile = process.env.GOOGLE_EARTH_ENGINE_KEY_FILE;

// The key's JSON itself, for hosts such as Vercel that have no private files, or a key file.
const loadKey = inlineKey
  ? async () => inlineKey
  : keyFile
    ? () => readFile(keyFile, "utf8")
    : null;

const source = createSatelliteSource({
  request:
    project && loadKey
      ? async () => requestSentinelTileUrl({ key: await loadKey(), project }, new Date())
      : null,
});

/** The satellite layer for the officer map, or null to show the street map only. */
export function satelliteLayer(): Promise<SatelliteLayer | null> {
  return source.layer();
}
