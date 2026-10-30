import { randomUUID } from "node:crypto";

import { createServerSupabase, type ServerSupabase } from "@/data/supabase-client";

/**
 * An in-memory stand-in for the parts of Supabase the app uses: the PostgREST endpoint for the
 * reports table and the Storage endpoints for the photo bucket. The real supabase-js client talks
 * to it through its fetch option, so tests exercise the requests the app really sends.
 *
 * It follows supabase/migrations/20261030120000_reports.sql: IDs must be tracking IDs that
 * match the report inside, duplicates are refused, every update raises the version, and the
 * bucket takes only small images. Error bodies carry row data, as Postgres's do, so tests can
 * check that the app never repeats them.
 */

export const FAKE_URL = "https://fake-project.supabase.test";
export const FAKE_SECRET_KEY = "sb_secret_fake_key_for_tests";

const TRACKING_ID = /^RPT-[0-9A-F]{4,12}$/;
const BUCKET = "report-photos";
const BUCKET_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET_LIMIT_BYTES = 2 * 1024 * 1024;
/** Query parameters that are not row filters. */
const NOT_FILTERS = new Set(["select", "order", "offset", "limit", "on_conflict", "columns"]);

export interface FakeRow {
  id: string;
  report: unknown;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface FakeSupabase {
  /** A real supabase-js client, created the way the app creates it, wired to this fake. */
  client: ServerSupabase;
  rows: Map<string, FakeRow>;
  objects: Map<string, { bytes: Buffer; contentType: string }>;
  /** Every request received, as "METHOD /path". */
  requests: string[];
  /** Runs just before an update is applied: lets a test save first, as another device would. */
  beforeUpdate: (id: string) => void;
  /** Return a response to answer a request in place of the fake, for example to fail it. */
  intercept: (method: string, path: string) => Response | undefined;
  /** Adds a row as an earlier save would have, bypassing the checks. */
  insertRow(id: string, report: unknown): void;
}

export function createFakeSupabase(): FakeSupabase {
  let tick = 0;
  // Postgres gives every row written by one statement the same time, and later statements later.
  const timestamp = () => new Date(Date.UTC(2026, 9, 30) + tick++).toISOString();

  const fake: FakeSupabase = {
    client: createServerSupabase({ url: FAKE_URL, secretKey: FAKE_SECRET_KEY }, (input, init) =>
      handle(new Request(input, init)),
    ),
    rows: new Map(),
    objects: new Map(),
    requests: [],
    beforeUpdate: () => undefined,
    intercept: () => undefined,
    insertRow(id, report) {
      const at = timestamp();
      fake.rows.set(id, { id, report, version: 1, created_at: at, updated_at: at });
    },
  };

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    fake.requests.push(`${request.method} ${url.pathname}`);

    const intercepted = fake.intercept(request.method, url.pathname);
    if (intercepted) return intercepted;
    if (request.headers.get("apikey") !== FAKE_SECRET_KEY) {
      return json(401, { message: "Invalid API key" });
    }
    if (url.pathname === "/rest/v1/reports") return handleReports(request, url);
    if (url.pathname.startsWith(`/storage/v1/object/${BUCKET}`)) return handleObjects(request, url);
    return json(404, { message: `No fake for ${url.pathname}` });
  }

  async function handleReports(request: Request, url: URL): Promise<Response> {
    const params = url.searchParams;
    const prefer = (request.headers.get("prefer") ?? "").split(",").map((part) => part.trim());

    if (request.method === "GET") {
      const order = (params.get("order") ?? "").split(",").filter(Boolean);
      const offset = Number(params.get("offset") ?? 0);
      const limit = Number(params.get("limit") ?? Number.MAX_SAFE_INTEGER);
      const rows = [...fake.rows.values()]
        .filter((row) => matches(row, params))
        .sort((a, b) => compareBy(order, a, b))
        .slice(offset, offset + limit);
      return json(
        200,
        rows.map((row) => pick(row, params.get("select"))),
      );
    }

    if (request.method === "POST") {
      const body = (await request.json()) as
        { id: string; report: unknown } | Array<{ id: string; report: unknown }>;
      const incoming = Array.isArray(body) ? body : [body];
      const ignoreDuplicates = prefer.includes("resolution=ignore-duplicates");

      for (const row of incoming) {
        const reportId = (row.report as { id?: unknown } | null)?.id;
        if (!TRACKING_ID.test(row.id) || reportId !== row.id) {
          return postgresError(400, "23514", "violates check constraint", row);
        }
        if (fake.rows.has(row.id) && !ignoreDuplicates) {
          return postgresError(409, "23505", "duplicate key value violates unique constraint", row);
        }
      }
      // One statement: every row is written, or none is.
      const at = timestamp();
      for (const row of incoming) {
        if (fake.rows.has(row.id)) continue;
        fake.rows.set(row.id, {
          id: row.id,
          report: row.report,
          version: 1,
          created_at: at,
          updated_at: at,
        });
      }
      return new Response(null, { status: 201 });
    }

    if (request.method === "PATCH") {
      const changes = (await request.json()) as { report: unknown };
      const id = params.get("id")?.replace(/^eq\./, "");
      if (id) fake.beforeUpdate(id);

      const updated: FakeRow[] = [];
      for (const row of fake.rows.values()) {
        if (!matches(row, params)) continue;
        // The trigger: every update raises the version and the update time.
        Object.assign(row, changes, { version: row.version + 1, updated_at: timestamp() });
        updated.push(row);
      }
      const select = params.get("select");
      return select === null
        ? new Response(null, { status: 204 })
        : json(
            200,
            updated.map((row) => pick(row, select)),
          );
    }

    return json(405, { message: `The fake does not support ${request.method}` });
  }

  async function handleObjects(request: Request, url: URL): Promise<Response> {
    const name = decodeURIComponent(url.pathname.slice(`/storage/v1/object/${BUCKET}/`.length));

    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") ?? "";
      const bytes = Buffer.from(await request.arrayBuffer());
      if (fake.objects.has(name) && request.headers.get("x-upsert") !== "true") {
        return storageError(409, "Duplicate", "The resource already exists");
      }
      if (!BUCKET_TYPES.includes(contentType)) {
        return storageError(415, "invalid_mime_type", `mime type ${contentType} is not supported`);
      }
      if (bytes.length > BUCKET_LIMIT_BYTES) {
        return storageError(
          413,
          "Payload too large",
          "The object exceeded the maximum allowed size",
        );
      }
      fake.objects.set(name, { bytes, contentType });
      return json(200, { Key: `${BUCKET}/${name}`, Id: randomUUID() });
    }

    if (request.method === "GET") {
      const object = fake.objects.get(name);
      if (!object) return storageError(404, "not_found", "Object not found");
      return new Response(new Uint8Array(object.bytes), {
        status: 200,
        headers: { "content-type": object.contentType },
      });
    }

    if (request.method === "DELETE") {
      const { prefixes } = (await request.json()) as { prefixes: string[] };
      const removed = prefixes.filter((prefix) => fake.objects.delete(prefix));
      return json(
        200,
        removed.map((removedName) => ({ name: removedName, bucket_id: BUCKET })),
      );
    }

    return json(405, { message: `The fake does not support ${request.method}` });
  }

  return fake;
}

/** Applies PostgREST "column=eq.value" filters. Any other operator fails the test loudly. */
function matches(row: FakeRow, params: URLSearchParams): boolean {
  for (const [column, condition] of params) {
    if (NOT_FILTERS.has(column)) continue;
    if (!condition.startsWith("eq."))
      throw new Error(`The fake supports only eq filters: ${condition}`);
    if (String(row[column as keyof FakeRow]) !== condition.slice(3)) return false;
  }
  return true;
}

function compareBy(order: string[], a: FakeRow, b: FakeRow): number {
  for (const term of order) {
    const [column, direction] = term.split(".");
    const left = String(a[column as keyof FakeRow]);
    const right = String(b[column as keyof FakeRow]);
    if (left !== right) return (left < right ? -1 : 1) * (direction === "desc" ? -1 : 1);
  }
  return 0;
}

function pick(row: FakeRow, select: string | null): Partial<FakeRow> {
  if (select === null || select === "*") return { ...row };
  return Object.fromEntries(
    select.split(",").map((column) => [column, row[column as keyof FakeRow]]),
  );
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Postgres puts the failing row in its error details. The app must never pass them on. */
function postgresError(status: number, code: string, message: string, row: unknown): Response {
  return json(status, {
    code,
    message,
    details: `Failing row contains ${JSON.stringify(row)}.`,
    hint: null,
  });
}

function storageError(status: number, error: string, message: string): Response {
  return json(status, { statusCode: String(status), error, message });
}
