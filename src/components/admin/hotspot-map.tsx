"use client";

import "leaflet/dist/leaflet.css";

import { Circle, CircleMarker, LayersControl, MapContainer, Popup, TileLayer } from "react-leaflet";

import type { HotspotView, MapMarker } from "@/application/dashboard";
import type { PriorityLevel } from "@/domain/types";
import type { SatelliteLayer } from "@/maps/satellite";

export interface HotspotMapProps {
  markers: readonly MapMarker[];
  hotspots: readonly HotspotView[];
  /** Satellite imagery from Google Earth Engine, or null to show the street map only. */
  satellite: SatelliteLayer | null;
}

const MARKER_COLORS: Record<PriorityLevel, string> = {
  urgent: "#991b1b",
  high: "#9a3412",
  medium: "#854d0e",
  low: "#52525b",
};

const STREET_MAP_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const STREET_MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const MAX_AUTO_ZOOM = 16;

export function HotspotMap({ markers, hotspots, satellite }: HotspotMapProps) {
  const points = markers.map((marker): [number, number] => [marker.lat, marker.lng]);

  return (
    <MapContainer
      bounds={points}
      boundsOptions={{ maxZoom: MAX_AUTO_ZOOM, padding: [24, 24] }}
      scrollWheelZoom={false}
      className="isolate h-96 w-full rounded-xl border border-zinc-200"
    >
      {satellite ? (
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite (Google Earth Engine)">
            <TileLayer url={satellite.urlTemplate} attribution={satellite.attribution} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street map (OpenStreetMap)">
            <TileLayer url={STREET_MAP_URL} attribution={STREET_MAP_ATTRIBUTION} />
          </LayersControl.BaseLayer>
        </LayersControl>
      ) : (
        <TileLayer url={STREET_MAP_URL} attribution={STREET_MAP_ATTRIBUTION} />
      )}

      {hotspots.map((hotspot) => (
        <Circle
          key={hotspot.id}
          center={[hotspot.center.lat, hotspot.center.lng]}
          radius={hotspot.radiusMeters}
          pathOptions={{ color: "#1d4ed8", weight: 2, dashArray: "6 6", fillOpacity: 0.08 }}
        >
          <Popup>{hotspot.title}</Popup>
        </Circle>
      ))}

      {markers.map((marker) => (
        <CircleMarker
          key={marker.id}
          center={[marker.lat, marker.lng]}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: MARKER_COLORS[marker.level],
            fillOpacity: 1,
          }}
        >
          <Popup>{marker.title}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
