/**
 * Unit tests for subject-batch selection in subjects.ts.
 *
 * Run with: deno test supabase/functions/ingest-crossref/
 * (pure logic: no HTTP calls, no secrets required.)
 */

import { SUBJECTS } from "./config.ts";
import { DEFAULT_BATCH_SIZE, resolveSubjects } from "./subjects.ts";

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

function assertThrows(fn: () => void, message?: string): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`Expected throw${message ? ": " + message : ""}, but nothing was thrown.`);
}

Deno.test("omitted subjects default to the first DEFAULT_BATCH_SIZE subjects", () => {
  assertEquals(DEFAULT_BATCH_SIZE, 2);
  assertEquals(resolveSubjects(undefined), SUBJECTS.slice(0, 2));
});

Deno.test("default batch never covers all subjects", () => {
  const selected = resolveSubjects(undefined);
  if (selected.length >= SUBJECTS.length) {
    throw new Error("Default batch must be a strict subset of all subjects.");
  }
});

Deno.test("explicit subset is honored in order", () => {
  assertEquals(resolveSubjects(["Robotics", "Physics"]), ["Robotics", "Physics"]);
});

Deno.test("explicit subset is de-duplicated preserving order", () => {
  assertEquals(resolveSubjects(["Physics", "Physics", "Chemistry"]), ["Physics", "Chemistry"]);
});

Deno.test("unknown subject names throw", () => {
  assertThrows(() => resolveSubjects(["Physics", "Astrology"]));
});

Deno.test("non-string entries throw", () => {
  assertThrows(() => resolveSubjects(["Physics", 42]));
});

Deno.test("empty array and non-array input throw", () => {
  assertThrows(() => resolveSubjects([]));
  assertThrows(() => resolveSubjects("Physics"));
  assertThrows(() => resolveSubjects(null));
});
