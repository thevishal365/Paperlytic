/**
 * Database-backed single-flight lease for the ingest-crossref Edge Function.
 *
 * Why a lease row and not a Postgres advisory lock: the Edge Function talks
 * to Postgres through stateless PostgREST HTTP calls, so there is no
 * database session that can be pinned across the whole run. A
 * session-bound advisory lock could be silently released (or never held)
 * once the HTTP call returns. A single lease row updated with one atomic
 * conditional PATCH is safe across independent invocations: exactly one
 * writer can move the row from free to held.
 *
 * Stale recovery: the lease carries an expiry timestamp. A crashed holder
 * never releases, but any later invocation whose clock is past the expiry
 * atomically steals the lease, so the lock can never stay stuck longer
 * than LEASE_TTL_MS.
 */

export const LEASE_NAME = "ingest-crossref";

/**
 * Lease time-to-live. A healthy run finishes in a few minutes; the hourly
 * cadence tolerates a stale lease of up to this long after a crash.
 * Chosen as 30 minutes so even a pathological all-subjects-retrying run
 * cannot outlive its own lease while still recovering well within the
 * one-hour schedule.
 */
export const LEASE_TTL_MS = 30 * 60 * 1000;

export interface LeaseRow {
  lock_name: string;
  holder: string | null;
  expires_at: string | null;
  updated_at: string;
}

export interface SkippedSummary {
  status: "skipped";
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
  error: string;
}

/** Expiry timestamp (ISO) for a lease acquired at nowMs. Pure: unit-tested. */
export function leaseExpiryIso(nowMs: number = Date.now()): string {
  return new Date(nowMs + LEASE_TTL_MS).toISOString();
}

/**
 * Whether a lease row counts as free at nowIso. Pure: unit-tested.
 * A missing row is NOT free: it means the lease migration was never
 * applied, and callers must fail closed instead of running unprotected.
 */
export function isLeaseFree(row: LeaseRow, nowIso: string): boolean {
  return row.expires_at === null || row.expires_at <= nowIso;
}

/** PostgREST OR-filter matching a free lease at nowIso. Pure: unit-tested. */
export function freeLeaseFilter(nowIso: string): string {
  return `or=(expires_at.is.null,expires_at.lt.${encodeURIComponent(nowIso)})`;
}

function leaseHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: "Bearer " + serviceRoleKey,
    "Content-Type": "application/json",
  };
}

async function readLeaseRow(restBase: string, serviceRoleKey: string): Promise<LeaseRow | null> {
  const response = await fetch(
    `${restBase}/ingestion_lease?lock_name=eq.${LEASE_NAME}&select=*&limit=1`,
    { headers: leaseHeaders(serviceRoleKey) },
  );
  if (!response.ok) {
    throw new Error(
      "Failed to read ingestion lease: HTTP " +
        response.status +
        ": " +
        (await response.text()).slice(0, 1000),
    );
  }
  const data = await response.json();
  return Array.isArray(data) && data.length > 0 ? (data[0] as LeaseRow) : null;
}

export interface AcquireResult {
  acquired: boolean;
  holder: string;
}

/**
 * Attempts to acquire the lease for holder. Fail-closed: throws when the
 * lease row is missing (migration not applied) or unreadable, so no run
 * ever executes without single-flight protection. Returns
 * {acquired:false} when another live holder owns the lease (including the
 * lost-race case where the row looked free on read but the atomic PATCH
 * matched zero rows).
 */
export async function tryAcquireLease(
  restBase: string,
  serviceRoleKey: string,
  holder: string,
  nowMs: number = Date.now(),
): Promise<AcquireResult> {
  const nowIso = new Date(nowMs).toISOString();
  const row = await readLeaseRow(restBase, serviceRoleKey);

  if (!row) {
    throw new Error(
      "Ingestion lease row is missing. Apply the ingestion-lease migration before running.",
    );
  }

  if (!isLeaseFree(row, nowIso)) {
    return { acquired: false, holder };
  }

  const response = await fetch(
    `${restBase}/ingestion_lease?lock_name=eq.${LEASE_NAME}&${freeLeaseFilter(nowIso)}`,
    {
      method: "PATCH",
      headers: { ...leaseHeaders(serviceRoleKey), Prefer: "return=representation" },
      body: JSON.stringify({
        holder,
        expires_at: leaseExpiryIso(nowMs),
        updated_at: nowIso,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      "Failed to acquire ingestion lease: HTTP " +
        response.status +
        ": " +
        (await response.text()).slice(0, 1000),
    );
  }
  const data = await response.json();
  return { acquired: Array.isArray(data) && data.length > 0, holder };
}

/**
 * Best-effort release: clears the lease only if this holder still owns it.
 * Callers swallow errors; an unreleased lease self-heals via expiry.
 */
export async function releaseLease(
  restBase: string,
  serviceRoleKey: string,
  holder: string,
): Promise<void> {
  const response = await fetch(
    `${restBase}/ingestion_lease?lock_name=eq.${LEASE_NAME}&holder=eq.${encodeURIComponent(holder)}`,
    {
      method: "PATCH",
      headers: leaseHeaders(serviceRoleKey),
      body: JSON.stringify({
        holder: null,
        expires_at: null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      "Failed to release ingestion lease: HTTP " +
        response.status +
        ": " +
        (await response.text()).slice(0, 1000),
    );
  }
}

/** Zero-counter skipped result for a lease-contention skip. Pure: unit-tested. */
export function buildSkippedSummary(
  runId: number | null,
  trigger: string,
  subjects: string[],
  reason: string,
): SkippedSummary {
  return {
    status: "skipped",
    runId,
    trigger,
    subjects,
    subjectsSucceeded: 0,
    subjectsFailed: 0,
    fetchedCount: 0,
    acceptedCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
    insertedCount: 0,
    error: reason,
  };
}
