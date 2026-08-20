import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { articlesInfiniteQueryOptions, formatDate, BASE_FEED_KEY, filterArticlesForFrontend } from "@/lib/articles";
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
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const isBaseFeed = query === "";

  const seed = useMemo(
    () =>
      isBaseFeed && initialFeed
        ? {
            data: { pages: [initialFeed.articles], pageParams: [0] },
            updatedAt: initialFeed.fetchedAt,
          }
        : undefined,
    [isBaseFeed, initialFeed],
  );

  const { data, error, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...articlesInfiniteQueryOptions(query),
      initialData: seed?.data,
      initialDataUpdatedAt: seed?.updatedAt,
      placeholderData: keepPreviousData,
    });

  const articles = useMemo(() => data?.pages.flat() ?? [], [data]);
  const visibleArticles = useMemo(
    () => filterArticlesForFrontend(articles),
    [articles],
  );
  const hasData = visibleArticles.length > 0;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="grid gap-6 border-b border-rule py-10 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h1 className="max-w-xl font-display text-3xl leading-tight sm:text-4xl">
              Newly published research, indexed every hour.
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
          {visibleArticles.map((a, i) => {
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
                      {doi && <span className="ml-2 font-mono text-xs text-primary">{doi}</span>}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ol>

        <div ref={sentinel} />

        {(isPending || isFetchingNextPage) && !hasData && (
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
