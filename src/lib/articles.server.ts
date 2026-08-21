import { franc } from "franc";

import {
  PAGE_SIZE,
  PAPERLYTIC_API,
  PAPERLYTIC_KEY,
  type Article,
  type ArticlePage,
} from "./articles";

async function fetchArticles(offset: number, search: string): Promise<Article[]> {
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

function filterArticlesForFrontend(articles: Article[]): Article[] {
  return articles.filter((article) => {
    const title = article.title?.trim();
    if (!title) return false;

    const letters = title.match(/[A-Za-z]/g);
    const hasLetters = letters !== null && letters.length > 0;

    if (hasLetters && title === title.toUpperCase()) {
      return false;
    }

    return franc(title, { minLength: 10 }) === "eng";
  });
}

export async function fetchVisibleArticlesPage(
  offset: number,
  search: string,
): Promise<ArticlePage> {
  const rawArticles = await fetchArticles(offset, search);

  return {
    articles: filterArticlesForFrontend(rawArticles),
    hasMore: rawArticles.length === PAGE_SIZE,
  };
}
