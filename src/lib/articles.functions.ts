import { createServerFn } from "@tanstack/react-start";

import type { ArticlePage } from "./articles";

export type InitialFeed = {
  articles: ArticlePage["articles"];
  hasMore: boolean;
  fetchedAt: number;
};

type ArticlesPageInput = {
  offset: number;
  search: string;
};

export const fetchArticlesPage = createServerFn({ method: "GET" })
  .validator((input: ArticlesPageInput) => input)
  .handler(async ({ data }): Promise<ArticlePage> => {
    const { fetchVisibleArticlesPage } = await import("./articles.server");
    return fetchVisibleArticlesPage(data.offset, data.search);
  });

/**
 * Server-rendered first page of the default (unsearched) feed.
 * Uses the same public publishable key as the browser — no privileged
 * credentials are involved, so the existing security model is unchanged.
 */
export const getInitialFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<InitialFeed | null> => {
    try {
      const { fetchVisibleArticlesPage } = await import("./articles.server");
      const page = await fetchVisibleArticlesPage(0, "");
      return { ...page, fetchedAt: Date.now() };
    } catch (error) {
      // SSR must never break the page: fall back to client-side fetching.
      console.error(error);
      return null;
    }
  },
);
