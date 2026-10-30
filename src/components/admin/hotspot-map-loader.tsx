"use client";

import dynamic from "next/dynamic";

import type { HotspotMapProps } from "./hotspot-map";

// Leaflet needs a browser, so the map is loaded only on the client. The list below the map
// carries the same information, so nothing is lost if the map cannot load.
const HotspotMap = dynamic<HotspotMapProps>(
  () => import("./hotspot-map").then((module) => module.HotspotMap),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="flex h-80 w-full items-center justify-center rounded-xl border border-zinc-200 text-sm text-zinc-700"
      >
        Loading map...
      </div>
    ),
  },
);

export function HotspotMapLoader(props: HotspotMapProps) {
  return <HotspotMap {...props} />;
}
