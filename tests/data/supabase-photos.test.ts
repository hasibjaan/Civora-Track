import { beforeEach, describe, expect, it } from "vitest";

import { InvalidPhotoError } from "@/data/photos";
import { SupabaseRequestError } from "@/data/supabase-client";
import { createSupabasePhotoStore } from "@/data/supabase-photos";

import { createFakeSupabase, type FakeSupabase } from "../support/fake-supabase";

const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46];
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function dataUrl(mimeType: string, bytes: number[]): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("createSupabasePhotoStore", () => {
  let fake: FakeSupabase;

  beforeEach(() => {
    fake = createFakeSupabase();
  });

  it("saves a valid JPEG in the private bucket and reads it back", async () => {
    const store = createSupabasePhotoStore(fake.client);

    const photo = await store.save("RPT-0000AAAA", dataUrl("image/jpeg", JPEG_BYTES));
    const bytes = await store.read("RPT-0000AAAA", photo.mimeType);

    expect(photo).toEqual({ mimeType: "image/jpeg" });
    expect([...bytes]).toEqual(JPEG_BYTES);
    expect(fake.objects.get("RPT-0000AAAA.jpg")?.contentType).toBe("image/jpeg");
  });

  it("checks the photo before sending anything to Supabase", async () => {
    const store = createSupabasePhotoStore(fake.client);

    await expect(store.save("RPT-0000AAAA", dataUrl("image/jpeg", PNG_BYTES))).rejects.toThrow(
      InvalidPhotoError,
    );
    await expect(store.save("../../etc/passwd", dataUrl("image/jpeg", JPEG_BYTES))).rejects.toThrow(
      "Invalid tracking ID",
    );
    expect(fake.requests).toEqual([]);
  });

  it("never replaces a stored photo", async () => {
    const store = createSupabasePhotoStore(fake.client);
    await store.save("RPT-0000AAAA", dataUrl("image/jpeg", JPEG_BYTES));

    await expect(
      store.save("RPT-0000AAAA", dataUrl("image/jpeg", [...JPEG_BYTES, 0x00])),
    ).rejects.toThrow(SupabaseRequestError);
    expect(fake.objects.get("RPT-0000AAAA.jpg")?.bytes.length).toBe(JPEG_BYTES.length);
  });

  it("removes a photo in one request, and does nothing if it is already gone", async () => {
    const store = createSupabasePhotoStore(fake.client);
    await store.save("RPT-0000AAAA", dataUrl("image/jpeg", JPEG_BYTES));

    await store.remove("RPT-0000AAAA");
    await store.remove("RPT-0000AAAA");

    expect(fake.objects.size).toBe(0);
    expect(fake.requests.filter((request) => request.startsWith("DELETE"))).toHaveLength(2);
  });

  it("reports a failed read with its status only", async () => {
    const store = createSupabasePhotoStore(fake.client);

    const error = await store.read("RPT-0000AAAA", "image/png").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SupabaseRequestError);
    expect(String(error)).toContain("404");
    expect(String(error)).not.toContain("Object not found");
  });
});
