/**
 * Subject-batch selection for the ingest-crossref Edge Function.
 *
 * One invocation handles only a small subset of subjects so a run always
 * fits the hosted Edge Function wall-clock limits (worst case per subject
 * is ~48s: 3 attempts x 15s timeout + 1s/2s retry sleeps). The scheduler
 * fans out with explicit batches; see supabase/scheduler/.
 */

import { SUBJECTS } from "./config.ts";

/**
 * Conservative initial batch size: 2 subjects per invocation keeps the
 * theoretical worst case (~96s + DB work) under the 150s Free-plan limit
 * with margin. 11 invocations of 2 cover all 22 subjects.
 */
export const DEFAULT_BATCH_SIZE = 2;

/**
 * Resolves the subjects for one invocation. Pure: unit-tested.
 * - omitted body value -> first DEFAULT_BATCH_SIZE subjects (never all 22
 *   by accident);
 * - explicit array -> validated member-wise against SUBJECTS, de-duplicated
 *   preserving order;
 * - anything else (unknown names, non-strings, empty array) -> throws, so
 *   the caller can reject with 400 before acquiring the lease or opening
 *   a run row.
 */
export function resolveSubjects(input: unknown): string[] {
  if (input === undefined) {
    return SUBJECTS.slice(0, DEFAULT_BATCH_SIZE);
  }

  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("subjects must be a non-empty array of known subject names.");
  }

  const known = new Set<string>(SUBJECTS);
  const invalid = input.filter(
    (subject): subject is string => typeof subject !== "string" || !known.has(subject),
  );
  if (invalid.length > 0) {
    throw new Error("Unknown subjects: " + invalid.map((subject) => String(subject)).join(", "));
  }

  return [...new Set(input as string[])];
}
