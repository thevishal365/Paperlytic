import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { Clock3, ExternalLink, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { MobileNav } from "@/components/MobileNav";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
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
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),

  component: Index,
});

function Index() {
  const { initialFeed } = Route.useLoaderData();
  const pageDisplaySize = 10;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(pageDisplaySize);
  const feedQuery = selectedSubject ?? query;

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setDisplayCount(pageDisplaySize);
  }, [feedQuery]);

  const isBaseFeed = feedQuery === "";
  const seed = useMemo(() => {
    if (!isBaseFeed || !initialFeed) return undefined;
    return {
      pages: [{ articles: initialFeed.articles, hasMore: initialFeed.hasMore }],
      pageParams: [0],
    };
  }, [isBaseFeed, initialFeed]);

  const { data, error, isPending, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...articlesInfiniteQueryOptions(feedQuery),
      ...(seed && initialFeed
        ? { initialData: seed, initialDataUpdatedAt: initialFeed.fetchedAt }
        : {}),
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

  const latestDate = displayedArticles[0]?.date;
  const filters = [
    "All papers",
    "Physics",
    "Chemistry",
    "Biology",
    "Mathematics",
    "Biochemistry",
    "Nanoscience",
    "Quantum Mechanics",
    "Computer Science",
    "Artificial Intelligence",
    "Machine Learning",
    "Quantum Computing",
    "Medicine",
    "Public Health",
    "Genetics",
    "Microbiology",
    "Data Science",
    "Neuroscience",
    "Psychology",
    "Sociology",
    "Economics",
    "Deep Learning",
    "Robotics",
  ];

  const selectFilter = (filter: string) => {
    setSearch("");
    setSelectedSubject(filter === "All papers" ? null : filter);
  };

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground sm:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-card shadow-sm">
        <SiteHeader />
        <main>
          <section className="sticky top-[65px] z-30 border-b border-border bg-card/95 px-4 pb-4 pt-3 backdrop-blur-lg sm:top-[69px] sm:px-6">
            <label className="relative block">
              <span className="sr-only">Search research papers</span>
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="paper-search"
                name="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search research papers…"
                className="h-11 w-full rounded-xl border-0 bg-muted pl-11 pr-4 text-sm outline-none ring-ring transition-shadow placeholder:text-muted-foreground focus:ring-2"
              />
            </label>
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
              {filters.map((filter) => {
                const active =
                  (filter === "All papers" && !selectedSubject && !query) ||
                  selectedSubject === filter;
                return (
                  <Button
                    key={filter}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "secondary"}
                    onClick={() => selectFilter(filter)}
                    className="shrink-0 rounded-full px-4 font-normal"
                  >
                    {filter}
                  </Button>
                );
              })}
            </div>
          </section>

          <section className="px-4 py-5 sm:px-6 sm:py-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-[0.6875rem] uppercase text-primary">
                  Live · updated hourly
                </p>
                <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                  {feedQuery ? `Results for “${feedQuery}”` : "Latest research"}
                </h1>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium text-muted-foreground">Newest first</p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[0.6875rem] text-muted-foreground">
                  <Clock3 className="size-3" />
                  {latestDate ? formatDate(latestDate) : "Refreshing"}
                </p>
              </div>
            </div>

            {error && hasData && (
              <p className="mb-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Couldn&apos;t refresh — showing saved feed.
              </p>
            )}
            {error && !hasData && <p className="py-10 text-sm text-destructive">{error.message}</p>}

            <ol className="space-y-3">
              {displayedArticles.map((article, index) => {
                const doi = article.doi ?? "";
                const href = doi ? `https://doi.org/${doi}` : "#";
                return (
                  <li
                    key={`${doi}-${index}`}
                    className="rise rounded-2xl border border-border bg-card p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                    style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
                  >
                    <article>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <span className="max-w-[75%] truncate rounded bg-accent px-2 py-1 font-display text-[0.625rem] font-bold uppercase text-primary">
                          {article.journal || "Independent research"}
                        </span>
                        {index === 0 && (
                          <span className="rounded bg-signal/10 px-2 py-1 font-display text-[0.625rem] font-bold uppercase text-signal">
                            Newest
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold leading-snug text-card-foreground sm:text-lg">
                        {article.title || "Untitled"}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          {formatDate(article.date)}
                        </span>
                        <span className="flex min-w-0 items-center gap-1">
                          <FileText className="size-3.5 shrink-0" />
                          <span className="max-w-[19rem] truncate">
                            {doi || "DOI not available"}
                          </span>
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                        <span className="font-display text-[0.625rem] uppercase text-muted-foreground">
                          Paper {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="flex items-center gap-2">
                          <BookmarkButton article={article} />
                          {doi && (
                            <Button asChild variant="feed" size="sm">
                              <a href={href} target="_blank" rel="noreferrer">
                                View paper
                                <ExternalLink />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>

            {hasMoreArticles && (
              <div className="flex justify-center pt-6">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleShowMore}
                  disabled={isFetchingNextPage}
                  className="w-full rounded-xl sm:w-auto"
                >
                  {isFetchingNextPage ? "Loading…" : "Show more papers"}
                </Button>
              </div>
            )}
            {(isPending || isFetching) && !hasData && (
              <p className="py-10 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Loading
              </p>
            )}
            {!isPending && !error && !hasData && (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No papers match that search.
              </p>
            )}
            {!hasNextPage && hasData && (
              <p className="py-8 text-center font-display text-[0.6875rem] uppercase text-muted-foreground">
                End of feed
              </p>
            )}
          </section>
        </main>
        <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
          Indexed from Crossref · Updated hourly ·{" "}
          <a
            href="https://x.com/thevishal365"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground"
          >
            Built by Vishal
          </a>
        </footer>
        <MobileNav />
      </div>
    </div>
  );
}
