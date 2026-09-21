/**
 * Unit tests for the pure lease helpers in lease.ts.
 *
 * Run with: deno test --allow-net supabase/functions/ingest-crossref/
 * (requires the Deno toolchain; network only for Deno's stdlib-free run —
 * these tests import nothing beyond lease.ts and make no HTTP calls.)
 */

import {
  LEASE_TTL_MS,
  buildSkippedSummary,
  freeLeaseFilter,
  isLeaseFree,
  leaseExpiryIso,
  type LeaseRow,
} from "./lease.ts";

declare const Deno: {
  test(name: string, fn: () => void | Promise<void>): void;
};

function assertEquals(actual: unknown, expected: unknown, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Assertion failed${message ? ": " + message : ""}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`,
    );
  }
}

function leaseRow(expiresAt: string | null): LeaseRow {
  return { lock_name: "ingest-crossref", holder: null, expires_at: expiresAt, updated_at: "" };
}

Deno.test("lease expiry is exactly LEASE_TTL_MS after acquisition", () => {
  const now = 1_700_000_000_000;
  assertEquals(new Date(leaseExpiryIso(now)).getTime() - now, LEASE_TTL_MS);
});

Deno.test("null expiry counts as free (fresh lease)", () => {
  assertEquals(isLeaseFree(leaseRow(null), new Date().toISOString()), true);
});

Deno.test("past expiry counts as free (stale-lock recovery)", () => {
  assertEquals(isLeaseFree(leaseRow("2020-01-01T00:00:00.000Z"), "2026-01-01T00:00:00.000Z"), true);
});

Deno.test("future expiry counts as held (live holder blocks)", () => {
  assertEquals(
    isLeaseFree(leaseRow("2026-01-01T00:00:00.000Z"), "2020-01-01T00:00:00.000Z"),
    false,
  );
});

Deno.test("equal expiry counts as free (boundary favors recovery)", () => {
  const instant = "2026-01-01T00:00:00.000Z";
  assertEquals(isLeaseFree(leaseRow(instant), instant), true);
});

Deno.test("free-lease filter encodes the timestamp and matches null or past", () => {
  const now = "2026-01-01T00:00:00.000Z";
  assertEquals(
    freeLeaseFilter(now),
    "or=(expires_at.is.null,expires_at.lt.2026-01-01T00%3A00%3A00.000Z)",
  );
});

Deno.test("skipped summary carries zero counters and the skip reason", () => {
  const skipped = buildSkippedSummary(
    42,
    "cron",
    ["Physics", "Chemistry"],
    "another_run_is_active",
  );
  assertEquals(skipped.status, "skipped");
  assertEquals(skipped.runId, 42);
  assertEquals(skipped.trigger, "cron");
  assertEquals(skipped.subjects, ["Physics", "Chemistry"]);
  assertEquals(skipped.subjectsSucceeded, 0);
  assertEquals(skipped.subjectsFailed, 0);
  assertEquals(skipped.fetchedCount, 0);
  assertEquals(skipped.acceptedCount, 0);
  assertEquals(skipped.duplicateCount, 0);
  assertEquals(skipped.rejectedCount, 0);
  assertEquals(skipped.insertedCount, 0);
  assertEquals(skipped.error, "another_run_is_active");
});
