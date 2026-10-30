import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createFilePhotoStore, InvalidPhotoError, sniffImageMimeType } from "@/data/photos";

const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46];
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_BYTES = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];

function dataUrl(mimeType: string, bytes: number[] | Buffer): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("sniffImageMimeType", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(sniffImageMimeType(Uint8Array.from(JPEG_BYTES))).toBe("image/jpeg");
    expect(sniffImageMimeType(Uint8Array.from(PNG_BYTES))).toBe("image/png");
    expect(sniffImageMimeType(Uint8Array.from(WEBP_BYTES))).toBe("image/webp");
  });

  it("returns null for anything else, such as HTML", () => {
    expect(sniffImageMimeType(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });
});

describe("createFilePhotoStore", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "photos-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("saves a valid JPEG and reads it back", async () => {
    const store = createFilePhotoStore(dir);

    const photo = await store.save("RPT-0000AAAA", dataUrl("image/jpeg", JPEG_BYTES));
    const bytes = await store.read("RPT-0000AAAA", photo.mimeType);

    expect(photo).toEqual({ mimeType: "image/jpeg" });
    expect([...bytes]).toEqual(JPEG_BYTES);
    expect((await stat(path.join(dir, "RPT-0000AAAA.jpg"))).isFile()).toBe(true);
  });

  it("rejects a file whose content does not match the type it claims", async () => {
    const store = createFilePhotoStore(dir);

    await expect(store.save("RPT-0000AAAA", dataUrl("image/jpeg", PNG_BYTES))).rejects.toThrow(
      InvalidPhotoError,
    );
  });

  it("rejects a data URL that is not a supported image type", async () => {
    const store = createFilePhotoStore(dir);

    await expect(
      store.save("RPT-0000AAAA", dataUrl("text/html", Buffer.from("<b>hi</b>"))),
    ).rejects.toThrow(InvalidPhotoError);
  });

  it("rejects a photo over the size limit", async () => {
    const store = createFilePhotoStore(dir);
    const tooBig = Buffer.alloc(2 * 1024 * 1024 + 1, 0xff);
    tooBig.set(JPEG_BYTES, 0);

    await expect(store.save("RPT-0000AAAA", dataUrl("image/jpeg", tooBig))).rejects.toThrow(
      "too large",
    );
  });

  it("refuses any tracking ID that could escape the photo directory", async () => {
    const store = createFilePhotoStore(dir);

    await expect(store.save("../../etc/passwd", dataUrl("image/jpeg", JPEG_BYTES))).rejects.toThrow(
      "Invalid tracking ID",
    );
    await expect(store.read("../secret", "image/png")).rejects.toThrow("Invalid tracking ID");
  });

  it("removes a photo, and does nothing if it is already gone", async () => {
    const store = createFilePhotoStore(dir);
    await store.save("RPT-0000AAAA", dataUrl("image/jpeg", JPEG_BYTES));

    await store.remove("RPT-0000AAAA");
    await store.remove("RPT-0000AAAA");

    await expect(readFile(path.join(dir, "RPT-0000AAAA.jpg"))).rejects.toThrow();
  });
});
