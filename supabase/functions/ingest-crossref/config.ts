/**
 * Ingestion constants and environment reader for the ingest-crossref
 * Edge Function.
 *
 * Values mirror backend/Config.js APP_CONFIG. Supabase connection details
 * come from Edge Function secrets (never committed).
 */

export const SUBJECTS: readonly string[] = [
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "Biochemistry",
  "Nanoscience",
  "Quantum Mechanics",
  "Computer Science",
  "Artificial Intelligence",
  "Machine Learning",
  "Quantum Computing",
  "Medicine",
  "Public Health",
  "Genetics",
  "Microbiology",
  "Data Science",
  "Neuroscience",
  "Psychology",
  "Sociology",
  "Economics",
  "Deep Learning",
  "Robotics",
];

export const CROSSREF_ROWS_PER_SUBJECT = 10;
export const MAX_ATTEMPTS = 3;
export const INITIAL_RETRY_DELAY_MS = 1000;
export const SUPABASE_BATCH_SIZE = 100;
export const FETCH_TIMEOUT_MS = 15000;

export interface Article {
  date: string | null;
  doi: string;
  title: string;
  journal: string;
  is_frontend_visible: boolean;
}

export interface IngestEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  crossrefMailto: string;
  ingestSecret: string;
}

declare const Deno: {
  env: { get(name: string): string | undefined };
};

/**
 * Reads Edge Function configuration.
 *
 * Secret model:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are PLATFORM-PROVIDED:
 *   Supabase injects them into every Edge Function automatically (the
 *   SUPABASE_ prefix is reserved). Do NOT set them via
 *   `supabase secrets set`; they only need to exist in local
 *   development shells. The legacy service-role key name is used because
 *   this function talks to PostgREST with raw fetch.
 * - Custom secrets (the only ones ever set via `supabase secrets set`):
 *   CROSSREF_MAILTO and INGEST_CRON_SECRET.
 *
 * SUPABASE_URL is the project base URL (e.g. https://xyz.supabase.co),
 * unlike the GAS SUPABASE_URL which already contained the full
 * /rest/v1/articles path; REST paths are appended by this function.
 */
export function getEnv(): IngestEnv {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const crossrefMailto = Deno.env.get("CROSSREF_MAILTO");
  const ingestSecret = Deno.env.get("INGEST_CRON_SECRET");

  const missing = [
    ["SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
    ["CROSSREF_MAILTO", crossrefMailto],
    ["INGEST_CRON_SECRET", ingestSecret],
  ]
    .filter(([, value]) => !value || !value.trim())
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error("Missing required Edge Function secrets: " + missing.join(", "));
  }

  const normalizedUrl = supabaseUrl!.replace(/\/$/, "");

  // Fail fast on the GAS-style value, which already contained the full
  // /rest/v1/articles path: REST paths are appended by this function.
  if (/\/rest\/v1(\/|$)/.test(normalizedUrl)) {
    throw new Error(
      "SUPABASE_URL must be the project base URL (e.g. https://xyz.supabase.co), " +
        "not a /rest/v1 path. The GAS SUPABASE_URL value cannot be reused here.",
    );
  }

  return {
    supabaseUrl: normalizedUrl,
    serviceRoleKey: serviceRoleKey!,
    crossrefMailto: crossrefMailto!,
    ingestSecret: ingestSecret!,
  };
}
