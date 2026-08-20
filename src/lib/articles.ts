import { infiniteQueryOptions } from "@tanstack/react-query";
import { franc } from "franc";

export const PAPERLYTIC_API = "https://wmdmqpttcqooqmhfprrm.supabase.co/rest/v1/articles";
export const PAPERLYTIC_KEY = "sb_publishable_EU2FR9zzKlBXBEkmpSS7YA_w1dEf5G8";

export const PAGE_SIZE = 30;

/** Bump when the persisted article shape changes to invalidate old caches. */
export const FEED_CACHE_VERSION = "paperlytic-feed-v1";

/** Cache key for the default, unsearched feed (the only persisted one). */
export const BASE_FEED_KEY = ["articles", ""] as const;

/** Keep the persisted/in-memory page count bounded. */
export const MAX_PAGES = 5;

export type Article = {
  date?: string | null;
  doi?: string | null;
  title?: string | null;
  journal?: string | null;
};

export function filterArticlesForFrontend(articles: Article[]): Article[] {
  return articles.filter((article) => {
    const title = article.title?.trim();

    // 1. Title must exist.
    if (!title) return false;

    // 2. Hide ALL-CAPS titles.
    const letters = title.match(/[A-Za-z]/g);
    const hasLetters = letters !== null && letters.length > 0;

    if (hasLetters && title === title.toUpperCase()) {
      return false;
    }

    // 3. Keep only English titles.
    const language = franc(title, {
      minLength: 10,
    });

    return language === "eng";
  });
}

export async function fetchArticles(offset: number, search: string): Promise<Article[]> {
  let url = `${PAPERLYTIC_API}?select=*&order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}`;
  const term = search.trim();
  if (term) {
    const q = encodeURIComponent(term);
    url += `&or=(title.ilike.*${q}*,journal.ilike.*${q}*)`;
  }

  const res = await fetch(url, {
    headers: {
      apikey: PAPERLYTIC_KEY,
      Authorization: `Bearer ${PAPERLYTIC_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`Feed unavailable (${res.status})`);
  return (await res.json()) as Article[];
}

export function formatDate(value?: string | null) {
  if (!value) return "Undated";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Undated";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function articlesInfiniteQueryOptions(search: string) {
  const term = search.trim();
  return infiniteQueryOptions({
    queryKey: ["articles", term] as const,
    queryFn: ({ pageParam }) => fetchArticles(pageParam, term),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    maxPages: MAX_PAGES,
    // Stale-while-revalidate: cached pages render instantly, a refresh runs
    // in the background once the data is older than a minute.
    staleTime: 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 2,
  });
}
