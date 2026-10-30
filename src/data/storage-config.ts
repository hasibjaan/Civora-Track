import "server-only";

import type { SupabaseSettings } from "./supabase-client";

export type StorageConfig = ({ kind: "supabase" } & SupabaseSettings) | { kind: "files" };

/**
 * Decides where reports and photos are kept. Supabase, when both of its settings are present,
 * so that every device shares the same data. Files in data/ when neither is, for a single
 * computer. Anything in between is a mistake, so it fails loudly instead of quietly keeping data
 * where other devices cannot see it.
 */
export function storageConfig(env: Record<string, string | undefined> = process.env): StorageConfig {
  const url = env.SUPABASE_URL?.trim();
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();

  if (url && secretKey) {
    if (secretKey.startsWith("sb_publishable_")) {
      throw new Error("SUPABASE_SECRET_KEY holds a publishable key. Use the project's secret key.");
    }
    return { kind: "supabase", url, secretKey };
  }
  if (url || secretKey) {
    throw new Error("Set both SUPABASE_URL and SUPABASE_SECRET_KEY, or neither.");
  }
  // Each Vercel function has its own read-only copy of the files, so nothing saved there is shared.
  if (env.VERCEL) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY. This deployment has no shared storage.");
  }
  return { kind: "files" };
}
