import { createServerFn } from "@tanstack/react-start";

import { fetchArticles, type Article } from "./articles";

export type InitialFeed = {
  articles: Article[];
  fetchedAt: number;
};

/**
 * Server-rendered first page of the default (unsearched) feed.
 * Uses the same public publishable key as the browser — no privileged
 * credentials are involved, so the existing security model is unchanged.
 */
export const getInitialFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<InitialFeed | null> => {
    try {
      const articles = await fetchArticles(0, "");
      return { articles, fetchedAt: Date.now() };
    } catch (error) {
      // SSR must never break the page: fall back to client-side fetching.
      console.error(error);
      return null;
    }
  },
);
