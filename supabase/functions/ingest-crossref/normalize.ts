/**
 * Crossref record validation and normalization.
 *
 * Direct port of backend/CrossrefService.js. Semantics are preserved
 * exactly; in particular no franc language detection is applied here
 * (frontend filtering in src/lib/articles.server.ts is unchanged and
 * remains the only franc consumer).
 */

import type { Article } from "./config.ts";

/** Matches only verified non-research paratext titles. */
const PROVEN_PARATEXT_TITLE_PATTERN =
  /^(issue information|graphical abstract toc|editorial board|contents continued)$/i;

/** Matches page strings consisting solely of Roman numerals (e.g. "i-ii", "iv"). */
const ROMAN_NUMERAL_PAGE_PATTERN = /^[ivxlcdm]+(?:[-–][ivxlcdm]+)?$/i;

/** Matches English language code prefixes ("en", "eng", "EN"). */
const ENGLISH_LANGUAGE_PREFIX = /^en/i;

export interface CrossrefItem {
  type?: unknown;
  language?: unknown;
  DOI?: unknown;
  title?: unknown;
  page?: unknown;
  "container-title"?: unknown;
  created?: unknown;
}

/**
 * Converts a Crossref item into the application data format.
 * Returns null for records that must be rejected (counted as rejected,
 * never inserted).
 */
export function normalizeCrossrefArticle(item: CrossrefItem | null | undefined): Article | null {
  if (!item) {
    return null;
  }

  if (item.type !== "journal-article") {
    return null;
  }

  // Missing language passes; only an explicit non-English code rejects.
  if (item.language && !ENGLISH_LANGUAGE_PREFIX.test(String(item.language).trim())) {
    return null;
  }

  const doi = normalizeDoi(item.DOI);

  if (!doi) {
    return null;
  }

  if (!Array.isArray(item.title) || item.title.length === 0) {
    return null;
  }

  const title = cleanCrossrefTitle(item.title[0]);

  if (!title || PROVEN_PARATEXT_TITLE_PATTERN.test(title)) {
    return null;
  }

  if (item.page && ROMAN_NUMERAL_PAGE_PATTERN.test(String(item.page).trim())) {
    return null;
  }

  const journal =
    Array.isArray(item["container-title"]) && item["container-title"].length > 0
      ? String(item["container-title"][0]).trim()
      : "Unknown Journal";

  return {
    date: extractCreatedDate(item),
    doi,
    title,
    journal,
    is_frontend_visible: isFrontendVisible(title),
  };
}

/** Normalizes DOI values for reliable duplicate detection. */
export function normalizeDoi(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

/** Cleans Crossref title markup, entities, and whitespace while preserving text. */
export function cleanCrossrefTitle(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
      const lowerEntity = entity.toLowerCase();

      if (lowerEntity === "amp") return "&";
      if (lowerEntity === "lt") return "<";
      if (lowerEntity === "gt") return ">";
      if (lowerEntity === "quot") return '"';
      if (lowerEntity === "apos") return "'";
      if (lowerEntity === "nbsp") return " ";

      if (lowerEntity.indexOf("#x") === 0) {
        return String.fromCodePoint(parseInt(lowerEntity.slice(2), 16));
      }

      if (lowerEntity.indexOf("#") === 0) {
        return String.fromCodePoint(parseInt(lowerEntity.slice(1), 10));
      }

      return match;
    })
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extracts the YYYY-MM-DD date portion of created["date-time"], or null. */
export function extractCreatedDate(item: CrossrefItem): string | null {
  const created =
    item.created && typeof item.created === "object"
      ? (item.created as Record<string, unknown>)["date-time"]
      : undefined;

  return created ? String(created).split("T")[0] : null;
}

/** Parity flag with GAS isFrontendVisible_: false for empty or all-uppercase titles. */
export function isFrontendVisible(title: string): boolean {
  const normalizedTitle = String(title ?? "").trim();

  if (!normalizedTitle) {
    return false;
  }

  return !(/\p{L}/u.test(normalizedTitle) && normalizedTitle === normalizedTitle.toUpperCase());
}
