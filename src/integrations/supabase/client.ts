import { createClient } from "@supabase/supabase-js";

import { PAPERLYTIC_KEY } from "@/lib/articles";
import type { Database } from "./types";

// Production article API host. Auth + bookmarks run against the same
// production Supabase project unless VITE_ overrides are provided
// (e.g. per-environment Netlify variables).
const FALLBACK_URL = "https://wmdmqpttcqooqmhfprrm.supabase.co";

function resolveConfig() {
  const url = import.meta.env["VITE_SUPABASE_URL"]?.trim() || FALLBACK_URL;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() || PAPERLYTIC_KEY;
  return { url, key };
}

function createSupabaseClient() {
  const { url, key } = resolveConfig();
  return createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let instance: ReturnType<typeof createSupabaseClient> | undefined;

// Lazy proxy so importing this module never throws during SSR/prerender
// when storage is unavailable; the client is built on first use.
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!instance) instance = createSupabaseClient();
    return Reflect.get(instance, prop, receiver);
  },
});
