/**
 * Crossref HTTP fetching with retry.
 *
 * Port of backend/Utils.js fetchWithRetry_ plus the request construction
 * and response validation from fetchCrossrefSubject_ in
 * backend/CrossrefService.js.
 */

import {
  CROSSREF_ROWS_PER_SUBJECT,
  FETCH_TIMEOUT_MS,
  INITIAL_RETRY_DELAY_MS,
  MAX_ATTEMPTS,
} from "./config.ts";
import type { CrossrefItem } from "./normalize.ts";

export function buildWorksUrl(subject: string): string {
  return (
    "https://api.crossref.org/works" +
    "?query=" +
    encodeURIComponent(subject) +
    "&filter=type:journal-article" +
    "&sort=created" +
    "&order=desc" +
    "&rows=" +
    CROSSREF_ROWS_PER_SUBJECT
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches one URL with exponential backoff: 1s then 2s delays across
 * 3 attempts. Retries thrown/network errors and non-2xx responses.
 */
export async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (response.ok) {
        return response;
      }

      lastError = new Error(
        "HTTP " + response.status + ": " + (await response.text()).slice(0, 500),
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("HTTP request failed.");
}

/** Fetches one Crossref subject and returns its work items. */
export async function fetchCrossrefSubject(
  subject: string,
  crossrefMailto: string,
): Promise<CrossrefItem[]> {
  const response = await fetchWithRetry(buildWorksUrl(subject), {
    method: "GET",
    headers: {
      "User-Agent": "Research Feed/1.0 (mailto:" + crossrefMailto + ")",
    },
  });

  if (response.status !== 200) {
    throw new Error(
      "Crossref returned HTTP " + response.status + ": " + (await response.text()).slice(0, 500),
    );
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new Error("Crossref returned invalid JSON.");
  }

  const items =
    body && typeof body === "object"
      ? (body as { message?: { items?: unknown } }).message?.items
      : undefined;

  if (!Array.isArray(items)) {
    throw new Error("Crossref response has an unexpected structure.");
  }

  return items as CrossrefItem[];
}
