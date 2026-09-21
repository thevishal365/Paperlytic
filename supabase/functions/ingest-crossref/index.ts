/**
 * ingest-crossref Edge Function.
 *
 * Supabase-based replacement for the Google Apps Script ingestion
 * (backend/Code.js). Runs on demand when invoked with the dedicated
 * ingestion secret; scheduling is deferred to Step 2.
 *
 * Behavior parity with GAS (per processed subject):
 * - identical Crossref request shape, retry delays, and record validation
 * - within-run DOI Set plus the existing articles PRIMARY KEY (doi)
 *   for cross-run deduplication via conflict-ignore upserts in batches
 *   of 100; existing rows are never updated
 * - no franc filtering at ingestion; no Google Sheets involvement
 *
 * Execution model: ONE invocation processes ONE small subject batch
 * (POST body {"subjects": [...]}; omitted defaults to the first
 * DEFAULT_BATCH_SIZE subjects, never all 22). Hosted Edge Function
 * wall-clock limits bound the worst case per subject (~48s: 3 attempts
 * x 15s timeout + 1s/2s retry sleeps), so the scheduler fans out with
 * batches of 2. Logging records exactly the subjects each invocation
 * processed.
 *
 * Metrics design: per-subject tallies are held in memory while articles
 * are upserted, then persisted to ingestion_subject_results only after
 * DB-conflict attribution is known, so subject rows and the run row can
 * never disagree about duplicate counts.
 */

import { SUPABASE_BATCH_SIZE, getEnv, type Article, type IngestEnv } from "./config.ts";
import { fetchCrossrefSubject } from "./crossref.ts";
import {
  buildSkippedSummary,
  releaseLease,
  tryAcquireLease,
  type SkippedSummary,
} from "./lease.ts";
import { normalizeCrossrefArticle } from "./normalize.ts";
import { resolveSubjects } from "./subjects.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type RunStatus = "running" | "completed" | "failed" | "skipped";

interface ExecutionSummary {
  status: RunStatus;
  runId: number | null;
  trigger: string;
  subjects: string[];
  subjectsSucceeded: number;
  subjectsFailed: number;
  fetchedCount: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  insertedCount: number;
  error?: string;
}

interface SubjectTally {
  subject: string;
  fetched: number;
  accepted: number;
  duplicates: number;
  rejected: number;
  status: "ok" | "failed";
  error: string | null;
}

function newHolderToken(): string {
  return `ingest-${crypto.randomUUID()}`;
}

function secretsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isAuthorized(req: Request, ingestSecret: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return secretsEqual(header.slice(7).trim(), ingestSecret);
  }
  return secretsEqual((req.headers.get("x-ingest-secret") ?? "").trim(), ingestSecret);
}

function serviceHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: "Bearer " + serviceRoleKey,
    "Content-Type": "application/json",
  };
}

async function postJson(url: string, serviceRoleKey: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      ...serviceHeaders(serviceRoleKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
}

async function throwUnlessOk(response: Response, label: string): Promise<unknown[]> {
  if (!response.ok) {
    throw new Error(
      label + " returned HTTP " + response.status + ": " + (await response.text()).slice(0, 1000),
    );
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

/**
 * Upserts one batch with conflict-ignore on the existing PRIMARY KEY
 * (doi) and returns the DOI rows the database actually inserted, derived
 * from the returned representation (never assumed from the request).
 */
async function upsertBatch(
  restBase: string,
  serviceRoleKey: string,
  batch: Article[],
): Promise<Pick<Article, "doi">[]> {
  const response = await fetch(restBase + "/articles?select=doi", {
    method: "POST",
    headers: {
      ...serviceHeaders(serviceRoleKey),
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify(batch),
  });

  if (!response.ok) {
    throw new Error(
      "Supabase returned HTTP " + response.status + ": " + (await response.text()).slice(0, 1000),
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as Pick<Article, "doi">[]) : [];
}

function blankSummary(): ExecutionSummary {
  return {
    status: "failed",
    runId: null,
    trigger: "unknown",
    subjects: [],
    subjectsSucceeded: 0,
    subjectsFailed: 0,
    fetchedCount: 0,
    acceptedCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
    insertedCount: 0,
  };
}

async function runIngestion(req: Request): Promise<Response> {
  let env: IngestEnv;
  try {
    env = getEnv();
  } catch (error) {
    const summary = blankSummary();
    summary.error = error instanceof Error ? error.message : String(error);
    return Response.json(summary, { status: 500 });
  }

  if (!isAuthorized(req, env.ingestSecret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let trigger = "manual";
  let rawSubjects: unknown;
  try {
    const body = await req.json();
    if (body && typeof body === "object") {
      const record = body as { trigger?: unknown; subjects?: unknown };
      if (typeof record.trigger === "string") {
        trigger = record.trigger;
      }
      rawSubjects = record.subjects;
    }
  } catch {
    // Empty or non-JSON body: defaults stand.
  }

  // Validate the subject batch BEFORE acquiring the lease or opening a run
  // row: invalid input is rejected with 400 and zero side effects, and the
  // default path can never fan out to all 22 subjects by accident.
  let selected: string[];
  try {
    selected = resolveSubjects(rawSubjects);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }

  const restBase = env.supabaseUrl + "/rest/v1";

  // Real single-flight: atomic database-lease acquisition. Fail-closed:
  // lease errors return 500 without running; contention records a
  // zero-counter skipped run and returns its summary with HTTP 200.
  const holder = newHolderToken();
  let acquired: boolean;
  try {
    acquired = (await tryAcquireLease(restBase, env.serviceRoleKey, holder)).acquired;
  } catch (error) {
    const summary = blankSummary();
    summary.trigger = trigger;
    summary.subjects = selected;
    summary.error = error instanceof Error ? error.message : String(error);
    return Response.json(summary, { status: 500 });
  }

  if (!acquired) {
    const reason = "another_run_is_active";
    let skippedRunId: number | null = null;
    try {
      const created = await postJson(restBase + "/ingestion_runs", env.serviceRoleKey, {
        status: "skipped",
        trigger,
        subjects: selected,
        finished_at: new Date().toISOString(),
        error: reason,
      });
      const rows = await throwUnlessOk(created, "ingestion_runs insert");
      const id = (rows[0] as { id?: unknown } | undefined)?.id;
      skippedRunId = typeof id === "number" ? id : null;
    } catch (error) {
      const summary = blankSummary();
      summary.trigger = trigger;
      summary.subjects = selected;
      summary.error = error instanceof Error ? error.message : String(error);
      return Response.json(summary, { status: 500 });
    }
    const skipped: SkippedSummary = buildSkippedSummary(skippedRunId, trigger, selected, reason);
    return Response.json(skipped);
  }

  const summary: ExecutionSummary = {
    status: "running",
    runId: null,
    trigger,
    subjects: selected,
    subjectsSucceeded: 0,
    subjectsFailed: 0,
    fetchedCount: 0,
    acceptedCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
    insertedCount: 0,
  };
  let runId: number | null = null;
  let runClosed = false;

  const finish = async (status: RunStatus, error: string | null): Promise<void> => {
    if (runClosed || runId === null) return;
    const response = await fetch(restBase + "/ingestion_runs?id=eq." + runId, {
      method: "PATCH",
      headers: serviceHeaders(env.serviceRoleKey),
      body: JSON.stringify({
        finished_at: new Date().toISOString(),
        status,
        subjects_succeeded: summary.subjectsSucceeded,
        subjects_failed: summary.subjectsFailed,
        fetched_count: summary.fetchedCount,
        accepted_count: summary.acceptedCount,
        duplicate_count: summary.duplicateCount,
        rejected_count: summary.rejectedCount,
        inserted_count: summary.insertedCount,
        error,
      }),
    });
    if (!response.ok) {
      throw new Error(
        "Failed to finalize ingestion run: HTTP " +
          response.status +
          ": " +
          (await response.text()).slice(0, 1000),
      );
    }
    summary.status = status;
    if (error) {
      summary.error = error;
    }
    runClosed = true;
  };

  try {
    const created = await postJson(restBase + "/ingestion_runs", env.serviceRoleKey, {
      status: "running",
      trigger,
      subjects: selected,
    });
    const createdRows = await throwUnlessOk(created, "ingestion_runs insert");
    const id = (createdRows[0] as { id?: unknown } | undefined)?.id;
    if (typeof id !== "number") {
      throw new Error("ingestion_runs insert returned no run id.");
    }
    runId = id;
    summary.runId = id;

    // Counter semantics (locked):
    // fetched = Crossref items received;
    // rejected = normalizeCrossrefArticle returned null;
    // accepted = validation passed and DOI first seen within this run;
    // duplicate = DOI already seen within this run OR lost a DB conflict;
    // inserted = rows actually returned as inserted by the DB operation.
    //
    // Each accepted DOI belongs to exactly one subject (enforced by the
    // within-run Set), so DB conflicts discovered during upserts can be
    // attributed back to their originating subject.
    const seenDois = new Set<string>();
    const accepted: { article: Article; subject: string }[] = [];
    const tallies: SubjectTally[] = [];
    const tallyBySubject = new Map<string, SubjectTally>();

    for (const subject of selected) {
      const tally: SubjectTally = {
        subject,
        fetched: 0,
        accepted: 0,
        duplicates: 0,
        rejected: 0,
        status: "ok",
        error: null,
      };
      tallies.push(tally);
      tallyBySubject.set(subject, tally);

      try {
        const items = await fetchCrossrefSubject(subject, env.crossrefMailto);
        tally.fetched = items.length;
        summary.fetchedCount += items.length;

        for (const item of items) {
          const article = normalizeCrossrefArticle(item);

          if (!article) {
            tally.rejected += 1;
            summary.rejectedCount += 1;
            continue;
          }

          if (seenDois.has(article.doi)) {
            tally.duplicates += 1;
            summary.duplicateCount += 1;
            continue;
          }

          seenDois.add(article.doi);
          accepted.push({ article, subject });
          tally.accepted += 1;
          summary.acceptedCount += 1;
        }

        summary.subjectsSucceeded += 1;
      } catch (error) {
        summary.subjectsFailed += 1;
        tally.status = "failed";
        tally.error = error instanceof Error ? error.message : String(error);
      }
    }

    // Parity with GAS: newest-first before writing.
    accepted.sort((a, b) =>
      String(b.article.date ?? "").localeCompare(String(a.article.date ?? "")),
    );

    // No Supabase retry in v1 (parity with GAS single-attempt POST):
    // a batch failure aborts the run and is recorded on the run row.
    for (let start = 0; start < accepted.length; start += SUPABASE_BATCH_SIZE) {
      const batch = accepted.slice(start, start + SUPABASE_BATCH_SIZE);
      const inserted = await upsertBatch(
        restBase,
        env.serviceRoleKey,
        batch.map((entry) => entry.article),
      );
      summary.insertedCount += inserted.length;

      // Accepted DOIs absent from the returned representation lost the
      // PRIMARY KEY conflict: attribute each to its originating subject.
      const insertedDois = new Set(inserted.map((row) => row.doi));
      for (const entry of batch) {
        if (!insertedDois.has(entry.article.doi)) {
          tallyBySubject.get(entry.subject)!.duplicates += 1;
          summary.duplicateCount += 1;
        }
      }
    }

    // Subject rows are persisted only after DB-conflict attribution is
    // known, so per-subject duplicates always include DB conflicts and
    // sum(subject.duplicates) reconciles with run.duplicate_count.
    for (const tally of tallies) {
      const response = await postJson(restBase + "/ingestion_subject_results", env.serviceRoleKey, {
        run_id: runId,
        subject: tally.subject,
        status: tally.status,
        fetched: tally.fetched,
        accepted: tally.accepted,
        duplicates: tally.duplicates,
        rejected: tally.rejected,
        error: tally.error,
      });
      await throwUnlessOk(response, "ingestion_subject_results insert");
    }

    await finish("completed", null);
    return Response.json({ ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runClosed) {
      // Finalization already succeeded; never overwrite a completed run.
      return Response.json({ ...summary });
    }
    if (runId === null) {
      summary.status = "failed";
      summary.error = message;
      return Response.json({ ...summary }, { status: 500 });
    }
    try {
      await finish("failed", message);
    } catch (closeError) {
      const closeMessage = closeError instanceof Error ? closeError.message : String(closeError);
      summary.status = "failed";
      summary.error = message + " (run finalization also failed: " + closeMessage + ")";
      return Response.json({ ...summary }, { status: 500 });
    }
    return Response.json({ ...summary }, { status: 500 });
  } finally {
    // Best-effort release: only this holder's token matches, so a stolen
    // (expired then re-acquired) lease is never cleared for someone else.
    // A release failure must not turn a completed ingestion into a failure;
    // expiry bounds the damage to LEASE_TTL_MS, and the warning below keeps
    // the failure visible in Edge Function logs.
    try {
      await releaseLease(restBase, env.serviceRoleKey, holder);
    } catch (error) {
      console.warn(
        "Ingestion lease release failed; lease self-heals via expiry:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

Deno.serve((req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed. Use POST." }, { status: 405 });
  }
  return runIngestion(req);
});
