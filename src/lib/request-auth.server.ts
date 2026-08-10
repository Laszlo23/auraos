/** Shared bearer/cookie auth for API route handlers (not createServerFn middleware). */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export function accessTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();

  const cookie = request.headers.get("cookie") ?? "";
  const match =
    cookie.match(/(?:^|;\s*)sb-[^=]+-auth-token=([^;]+)/) ??
    cookie.match(/(?:^|;\s*)supabase-auth-token=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    const raw = decodeURIComponent(match[1]);
    const parsed = JSON.parse(raw) as { access_token?: string } | string[];
    if (Array.isArray(parsed)) return parsed[0] ?? null;
    if (parsed && typeof parsed === "object" && parsed.access_token) return parsed.access_token;
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}

export async function requireUserFromRequest(request: Request): Promise<
  | { ok: true; userId: string; token: string; supabase: ReturnType<typeof createClient<Database>> }
  | { ok: false; response: Response }
> {
  const token = accessTokenFromRequest(request);
  if (!token) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const anon =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!supabaseUrl || !anon) {
    return {
      ok: false,
      response: Response.json({ error: "Supabase is not configured" }, { status: 500 }),
    };
  }

  const supabase = createClient<Database>(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, userId: user.id, token, supabase };
}
