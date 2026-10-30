import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase-schema";

export type ServerSupabase = SupabaseClient<Database>;

export interface SupabaseSettings {
  url: string;
  secretKey: string;
}

/**
 * A request to Supabase that takes longer than this is abandoned, so a page cannot hang on it.
 * Typical requests take well under a second. supabase-js retries a failed read up to three times.
 */
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * A Supabase client for the server. It acts with the project's secret key, which bypasses row
 * level security, so this module must never reach the browser. It keeps no user session.
 */
export function createServerSupabase(
  { url, secretKey }: SupabaseSettings,
  fetchImpl: typeof fetch = fetch,
): ServerSupabase {
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: withTimeout(fetchImpl) },
  });
}

// Passing a signal also keeps Next.js from reusing an earlier response within one render, so a
// report read again after a conflicting save is always read fresh.
function withTimeout(fetchImpl: typeof fetch): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetchImpl(input, { ...init, signal });
  };
}

/** The parts of a Supabase error that are safe to log. Messages and details can hold report data. */
export interface FailureCodes {
  code?: string;
  status?: number;
}

const MISSING_TABLE = " Run the SQL in supabase/migrations to create the table and bucket.";

/** Likely setup mistakes, named so the server log says what to fix. */
const SETUP_HINTS: Record<string, string> = {
  PGRST205: MISSING_TABLE,
  "42P01": MISSING_TABLE,
  "42501": " SUPABASE_SECRET_KEY must be the project's secret key.",
  "HTTP 401": " Supabase refused SUPABASE_SECRET_KEY.",
};

/** A failed request to Supabase. Its message names the operation and the error code only. */
export class SupabaseRequestError extends Error {
  readonly code: string;

  constructor(operation: string, { code, status }: FailureCodes) {
    const reason = code || (status ? `HTTP ${status}` : "no response");
    super(`Supabase could not ${operation} (${reason}).${SETUP_HINTS[reason] ?? ""}`);
    this.name = "SupabaseRequestError";
    this.code = reason;
  }
}
