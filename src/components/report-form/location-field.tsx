"use client";

import { LoaderCircle, LocateFixed } from "lucide-react";
import { useState } from "react";

import { FieldError, FieldLabel, inputClassName } from "./form-field";

export interface LocationValue {
  lat: number | null;
  lng: number | null;
  address: string;
}

interface LocationFieldProps {
  value: LocationValue;
  onChange: (patch: Partial<LocationValue>) => void;
  errors: Record<string, string>;
}

const STATUS_ID = "location-status";
const COORDINATES_ERROR_ID = "coordinates-error";
const ADDRESS_ERROR_ID = "address-error";

export function LocationField({ value, onChange, errors }: LocationFieldProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const hasCoordinates = value.lat !== null && value.lng !== null;
  const coordinatesError = errors["location.lat"] ?? errors["location.lng"];

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setGeoMessage("This browser cannot read your location. Enter coordinates instead.");
      return;
    }

    setIsLocating(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({ lat: coords.latitude, lng: coords.longitude });
        setGeoMessage(`Location captured. Accuracy is about ${Math.round(coords.accuracy)} m.`);
        setIsLocating(false);
      },
      (error) => {
        setGeoMessage(geolocationMessage(error.code));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-base font-medium text-zinc-900 dark:text-zinc-100">
        Where is it? <span className="text-red-700 dark:text-red-400">*</span>
      </legend>

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={isLocating}
        aria-describedby={STATUS_ID}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-zinc-900 px-4 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900/40 disabled:opacity-60 dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
      >
        {isLocating ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          <LocateFixed className="size-5" aria-hidden />
        )}
        {isLocating ? "Finding your location..." : "Use my current location"}
      </button>

      <p id={STATUS_ID} role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
        {geoMessage ??
          (hasCoordinates
            ? `Pinned at ${value.lat?.toFixed(5)}, ${value.lng?.toFixed(5)}.`
            : "Allow location access, or type the coordinates below.")}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="lat">Latitude</FieldLabel>
          <input
            id="lat"
            type="number"
            inputMode="decimal"
            step="any"
            className={inputClassName}
            value={value.lat ?? ""}
            onChange={(event) => onChange({ lat: parseCoordinate(event.target.value) })}
            aria-invalid={Boolean(coordinatesError)}
            aria-describedby={coordinatesError ? COORDINATES_ERROR_ID : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="lng">Longitude</FieldLabel>
          <input
            id="lng"
            type="number"
            inputMode="decimal"
            step="any"
            className={inputClassName}
            value={value.lng ?? ""}
            onChange={(event) => onChange({ lng: parseCoordinate(event.target.value) })}
            aria-invalid={Boolean(coordinatesError)}
            aria-describedby={coordinatesError ? COORDINATES_ERROR_ID : undefined}
          />
        </div>
      </div>
      <FieldError id={COORDINATES_ERROR_ID} message={coordinatesError} />

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="address" required>
          Nearest landmark or street
        </FieldLabel>
        <input
          id="address"
          type="text"
          autoComplete="off"
          placeholder="For example: opposite the City Hospital gate"
          className={inputClassName}
          value={value.address}
          onChange={(event) => onChange({ address: event.target.value })}
          aria-required="true"
          aria-invalid={Boolean(errors["location.address"])}
          aria-describedby={errors["location.address"] ? ADDRESS_ERROR_ID : undefined}
        />
        <FieldError id={ADDRESS_ERROR_ID} message={errors["location.address"]} />
      </div>
    </fieldset>
  );
}

function parseCoordinate(raw: string): number | null {
  return raw === "" ? null : Number(raw);
}

function geolocationMessage(code: number): string {
  switch (code) {
    case GeolocationPositionError.PERMISSION_DENIED:
      return "Location access was blocked. Allow it in your browser settings, or type the coordinates below.";
    case GeolocationPositionError.POSITION_UNAVAILABLE:
      return "Your position is unavailable right now. Try again, or type the coordinates below.";
    default:
      return "Finding your location took too long. Try again.";
  }
}
