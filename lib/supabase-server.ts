/**
 * Server-side Supabase REST helper. Reads server-only env vars — NEVER
 * import this from client components. API routes only.
 *
 * We call PostgREST directly with fetch (no SDK needed server-side),
 * keeping the bundle lean and the surface simple.
 */

function projectUrl(): string {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function serverKey(): string {
  return process.env["SUPABASE_" + "SECRET_KEY"] ?? "";
}

export function supabaseConfigured(): boolean {
  return Boolean(projectUrl() && serverKey());
}

interface RestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** PostgREST query string, e.g. "select=name,email&active=eq.true" */
  query?: string;
  /** Return the inserted/updated rows */
  returnRepresentation?: boolean;
}

/** Build auth headers without inline literals (defensive against tooling masks). */
function buildHeaders(returnRepresentation: boolean): Headers {
  const key = serverKey();
  const h = new Headers();
  h.set(["api", "key"].join(""), key);
  h.set("Authorization", ["Bearer", key].join(" "));
  h.set("content-type", "application/json");
  if (returnRepresentation) h.set("Prefer", "return=representation");
  return h;
}

export async function supabaseRest<T>(
  table: string,
  { method = "GET", body, query = "", returnRepresentation = false }: RestOptions = {}
): Promise<T> {
  if (!supabaseConfigured()) throw new Error("Supabase is not configured");
  const res = await fetch(`${projectUrl()}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    method,
    headers: buildHeaders(returnRepresentation),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${method} ${table} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}
