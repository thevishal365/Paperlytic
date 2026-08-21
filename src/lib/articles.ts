import { infiniteQueryOptions } from "@tanstack/react-query";

import { fetchArticlesPage } from "./articles.functions";

export const PAPERLYTIC_API = "https://wmdmqpttcqooqmhfprrm.supabase.co/rest/v1/articles";
export const PAPERLYTIC_KEY = "sb_publishable_EU2FR9zzKlBXBEkmpSS7YA_w1dEf5G8";

export const PAGE_SIZE = 30;

/** Bump when the persisted article shape changes to invalidate old caches. */
export const FEED_CACHE_VERSION = "paperlytic-feed-v2";

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

export type ArticlePage = {
  articles: Article[];
  hasMore: boolean;
};

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
    queryFn: ({ pageParam }) => fetchArticlesPage({ data: { offset: pageParam, search: term } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
    maxPages: MAX_PAGES,
    // Stale-while-revalidate: cached pages render instantly, a refresh runs
    // in the background once the data is older than a minute.
    staleTime: 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 2,
  });
}
