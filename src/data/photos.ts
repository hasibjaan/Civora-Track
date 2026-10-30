import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, TRACKING_ID_PATTERN } from "@/domain/schemas";
import type { Photo } from "@/domain/types";

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

const EXTENSIONS: Record<ImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

/** Raised for photos that are malformed or not the image type they claim to be. Safe to show. */
export class InvalidPhotoError extends Error {}

export interface PhotoStore {
  save(reportId: string, dataUrl: string): Promise<Photo>;
  read(reportId: string, mimeType: ImageMimeType): Promise<Buffer>;
  remove(reportId: string): Promise<void>;
}

/**
 * Decodes a photo sent as a data URL. Checks its size, and checks its file signature rather
 * than the type the browser claimed. Every photo store calls this before storing anything.
 */
export function decodePhoto(dataUrl: string): { mimeType: ImageMimeType; bytes: Buffer } {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) throw new InvalidPhotoError("Attach a JPEG, PNG or WebP photo.");

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new InvalidPhotoError("This photo is too large. Try a smaller one.");
  }

  const mimeType = sniffImageMimeType(bytes);
  if (mimeType === null || mimeType !== match[1]) {
    throw new InvalidPhotoError("The file is not a valid JPEG, PNG or WebP image.");
  }
  return { mimeType, bytes };
}

/**
 * The name a report's photo is stored under. It is built only from a validated tracking ID, so
 * a crafted ID cannot point outside the photo folder or bucket.
 */
export function photoFileName(reportId: string, mimeType: ImageMimeType): string {
  if (!TRACKING_ID_PATTERN.test(reportId)) {
    throw new Error(`Invalid tracking ID: ${reportId}`);
  }
  return `${reportId}.${EXTENSIONS[mimeType]}`;
}

/** Every name a report's photo could have, one for each image type. */
export function photoFileNames(reportId: string): string[] {
  return IMAGE_MIME_TYPES.map((mimeType) => photoFileName(reportId, mimeType));
}

/** Stores report photos as files in one directory, for a single computer. */
export function createFilePhotoStore(directory: string): PhotoStore {
  return {
    async save(reportId, dataUrl) {
      const { mimeType, bytes } = decodePhoto(dataUrl);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, photoFileName(reportId, mimeType)), bytes, {
        flag: "wx",
      });
      return { mimeType };
    },

    async read(reportId, mimeType) {
      return readFile(path.join(directory, photoFileName(reportId, mimeType)));
    },

    async remove(reportId) {
      await Promise.all(
        photoFileNames(reportId).map((name) => rm(path.join(directory, name), { force: true })),
      );
    },
  };
}

/** Identifies an image from its first bytes (its "magic number"). Returns null if unknown. */
export function sniffImageMimeType(bytes: Uint8Array): ImageMimeType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (matchesAscii(bytes, 0, "\x89PNG")) return "image/png";
  if (matchesAscii(bytes, 0, "RIFF") && matchesAscii(bytes, 8, "WEBP")) return "image/webp";
  return null;
}

function matchesAscii(bytes: Uint8Array, offset: number, text: string): boolean {
  return [...text].every((char, index) => bytes[offset + index] === char.charCodeAt(0));
}
