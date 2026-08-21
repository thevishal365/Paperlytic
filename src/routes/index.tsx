import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { articlesInfiniteQueryOptions, formatDate, BASE_FEED_KEY } from "@/lib/articles";
import { getInitialFeed } from "@/lib/articles.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paperlytic — Live feed for academia" },
      {
        name: "description",
        content:
          "A minimal, hourly-updated index of newly published academic papers from Crossref.",
      },
      { property: "og:title", content: "Paperlytic — Live feed for academia" },
      {
        property: "og:description",
        content: "Newly published academic papers from Crossref, updated hourly.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://paperlytic.netlify.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://paperlytic.netlify.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Paperlytic",
            url: "https://paperlytic.netlify.app/",
            description:
              "A minimal, hourly-updated index of newly published academic papers from Crossref.",
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Paperlytic",
            url: "https://paperlytic.netlify.app/",
            logo: "https://paperlytic.netlify.app/apple-touch-icon.png",
          },
        ]),
      },
    ],
  }),

  // Server-render page 1 of the default feed so first-time visitors see
  // papers in the initial HTML. Skipped when the cache already has the feed
  // (client navigations), and never fatal if Supabase is unavailable.
  loader: async ({ context }) => {
    const cached = context.queryClient.getQueryData(BASE_FEED_KEY);
    if (cached) return { initialFeed: null };
    return { initialFeed: await getInitialFeed() };
  },

  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 font-mono text-sm">
      {error.message}
    </div>
  ),

  component: Index,
});

function Index() {
  const { initialFeed } = Route.useLoaderData();
  const pageDisplaySize = 10;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(pageDisplaySize);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setDisplayCount(pageDisplaySize);
  }, [query]);

  const isBaseFeed = query === "";

  const seed = useMemo(() => {
    if (!isBaseFeed) return undefined;

    return {
      data: {
        pages: [
          {
            articles: initialFeed?.articles ?? [],
            hasMore: initialFeed?.hasMore ?? false,
          },
        ],
        pageParams: [0],
      },
      updatedAt: initialFeed?.fetchedAt ?? 0,
    };
  }, [isBaseFeed, initialFeed]);

  const { data, error, isPending, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...articlesInfiniteQueryOptions(query),
      initialData: seed?.data,
      initialDataUpdatedAt: seed?.updatedAt,
      placeholderData: keepPreviousData,
    });

  const articles = useMemo(() => data?.pages.flatMap((page) => page.articles) ?? [], [data]);
  const displayedArticles = articles.slice(0, displayCount);
  const hasData = articles.length > 0;
  const hasMoreArticles = displayedArticles.length < articles.length || hasNextPage;

  const handleShowMore = () => {
    setDisplayCount((count) => count + pageDisplaySize);
    if (hasNextPage) void fetchNextPage();
  };

  return (
    <div>
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-0">
        <section className="grid gap-6 border-b border-rule py-10 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Latest Academic Research Feed
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {query && `Search — ${query}`}
            </p>
          </div>

          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Search papers</span>
            <input
              id="paper-search"
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or journal"
              className="w-full border-b border-rule bg-transparent pb-2 pr-6 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            <span className="pointer-events-none absolute bottom-2 right-0 font-mono text-xs text-primary">
              /
            </span>
          </label>
        </section>

        {error && hasData && (
          <p className="pt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Couldn't refresh — showing saved feed
          </p>
        )}

        {error && !hasData && (
          <p className="py-10 font-mono text-sm text-destructive">{error.message}</p>
        )}

        <ol>
          {displayedArticles.map((a, i) => {
            const doi = a.doi ?? "";
            const href = doi ? `https://doi.org/${doi}` : "#";
            return (
              <li key={`${doi}-${i}`} className="border-b border-rule">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group grid gap-1 py-6 sm:grid-cols-[5.5rem_1fr] sm:gap-8"
                >
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {formatDate(a.date)}
                  </span>
                  <div>
                    <h2 className="font-mono text-base leading-relaxed decoration-primary/60 underline-offset-4 group-hover:underline sm:text-lg">
                      {a.title || "Untitled"}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      <span className="text-foreground/70">{a.journal || "Unknown journal"}</span>
                      {doi && (
                        <span className="ml-2 break-all font-mono text-xs text-primary">{doi}</span>
                      )}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ol>

        {hasMoreArticles && (
          <div className="flex justify-center pt-10">
            <button
              type="button"
              onClick={handleShowMore}
              disabled={isFetchingNextPage}
              className="border border-rule px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetchingNextPage ? "Loading" : "Show More"}
            </button>
          </div>
        )}

        {(isPending || isFetching) && !hasData && (
          <p className="py-10 text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Loading
          </p>
        )}

        {isFetchingNextPage && hasData && (
          <p className="py-10 text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Loading
          </p>
        )}

        {!isPending && !error && !hasData && (
          <p className="py-16 text-center font-display text-2xl text-muted-foreground">
            No papers match that search.
          </p>
        )}

        {!hasNextPage && hasData && (
          <p className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            End of feed
          </p>
        )}
      </main>
    </div>
  );
}
