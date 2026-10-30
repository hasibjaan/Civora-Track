import { describe, expect, it } from "vitest";

import { storageConfig } from "@/data/storage-config";

const PROJECT_URL = "https://abcd.supabase.co";
const SECRET_KEY = "sb_secret_abc123";

describe("storageConfig", () => {
  it("uses files in data/ when Supabase is not configured", () => {
    expect(storageConfig({})).toEqual({ kind: "files" });
    expect(storageConfig({ SUPABASE_URL: " ", SUPABASE_SECRET_KEY: "" })).toEqual({
      kind: "files",
    });
  });

  it("uses Supabase when both settings are present, ignoring stray spaces", () => {
    expect(
      storageConfig({ SUPABASE_URL: ` ${PROJECT_URL} `, SUPABASE_SECRET_KEY: `${SECRET_KEY}\n` }),
    ).toEqual({ kind: "supabase", url: PROJECT_URL, secretKey: SECRET_KEY });
  });

  it("refuses half a configuration rather than quietly using local files", () => {
    expect(() => storageConfig({ SUPABASE_URL: PROJECT_URL })).toThrow("Set both");
    expect(() => storageConfig({ SUPABASE_SECRET_KEY: SECRET_KEY })).toThrow("Set both");
  });

  it("refuses the publishable key, which cannot reach the closed table", () => {
    expect(() =>
      storageConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_SECRET_KEY: "sb_publishable_abc123" }),
    ).toThrow("publishable key");
  });

  it("refuses to run on Vercel without Supabase, where files are not shared or kept", () => {
    expect(() => storageConfig({ VERCEL: "1" })).toThrow("no shared storage");
    expect(
      storageConfig({ VERCEL: "1", SUPABASE_URL: PROJECT_URL, SUPABASE_SECRET_KEY: SECRET_KEY })
        .kind,
    ).toBe("supabase");
  });
});
