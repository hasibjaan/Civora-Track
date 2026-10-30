import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, TRACKING_ID_PATTERN } from "@/domain/schemas";
import type { Photo } from "@/domain/types";

type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

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
 * Stores report photos as files in one directory. File names come only from validated
 * tracking IDs, so a crafted ID cannot point outside that directory.
 */
export function createPhotoStore(directory: string): PhotoStore {
  function fileFor(reportId: string, mimeType: ImageMimeType): string {
    assertTrackingId(reportId);
    return path.join(directory, `${reportId}.${EXTENSIONS[mimeType]}`);
  }

  return {
    async save(reportId, dataUrl) {
      const match = DATA_URL_PATTERN.exec(dataUrl);
      if (!match) throw new InvalidPhotoError("Attach a JPEG, PNG or WebP photo.");

      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > MAX_IMAGE_BYTES) {
        throw new InvalidPhotoError("This photo is too large. Try a smaller one.");
      }

      // Check the file's signature, not just the type the browser claimed.
      const actual = sniffImageMimeType(bytes);
      if (actual === null || actual !== match[1]) {
        throw new InvalidPhotoError("The file is not a valid JPEG, PNG or WebP image.");
      }

      await mkdir(directory, { recursive: true });
      await writeFile(fileFor(reportId, actual), bytes, { flag: "wx" });
      return { mimeType: actual };
    },

    async read(reportId, mimeType) {
      return readFile(fileFor(reportId, mimeType));
    },

    async remove(reportId) {
      await Promise.all(
        IMAGE_MIME_TYPES.map((mimeType) => rm(fileFor(reportId, mimeType), { force: true })),
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

function assertTrackingId(reportId: string): void {
  if (!TRACKING_ID_PATTERN.test(reportId)) {
    throw new Error(`Invalid tracking ID: ${reportId}`);
  }
}
