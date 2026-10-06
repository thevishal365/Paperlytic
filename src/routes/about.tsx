import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Paperlytic — How the research feed is built" },
      {
        name: "description",
        content:
          "Paperlytic pulls new papers from Crossref every hour, cleans them, stores them in Postgres, and serves a fast, clutter-free research feed.",
      },
      { property: "og:title", content: "About Paperlytic" },
      {
        property: "og:description",
        content:
          "The pipeline behind Paperlytic: Crossref API, an hourly serverless worker, Postgres storage, and a minimal live frontend.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://paperlytic.netlify.app/about" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://paperlytic.netlify.app/about" }],
  }),

  component: About,
});

const steps = [
  {
    n: "01",
    title: "The data source",
    body: "Paperlytic pulls newly registered academic-paper records directly from the Crossref API, covering research across a wide range of subjects.",
  },
  {
    n: "02",
    title: "The engine",
    body: "Eleven scheduled ingestion batches run throughout the hour, processing two subjects at a time. A Supabase Edge Function fetches, normalises, validates, and deduplicates the records before they enter the database.",
  },
  {
    n: "03",
    title: "The store",
    body: "Clean records are stored in PostgreSQL, with DOI-based deduplication keeping the feed consistent. A daily maintenance job keeps the latest 100,000 articles while pruning older rows.",
  },
  {
    n: "04",
    title: "The interface",
    body: "The frontend reads directly from the Supabase database, with live search, infinite scrolling, and direct DOI links to every paper.",
  },
];

function About() {
  return (
    <div className="min-h-screen bg-background pb-20 text-foreground sm:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-card shadow-sm">
        <SiteHeader />

        <main className="px-4 py-5 sm:px-6 sm:py-6">
          <p className="font-display text-[0.6875rem] uppercase text-primary">About the feed</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">
            An automated, real-time feed of the latest academic research.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Paperlytic tracks and aggregates newly registered papers across physics, biology,
            medicine, computer science and beyond — refreshed hourly, with nothing between you and
            the source.
          </p>

          <ol className="mt-12 border-t border-border">
            {steps.map((s) => (
              <li
                key={s.n}
                className="grid gap-2 border-b border-border py-6 sm:grid-cols-[auto_1fr] sm:gap-8"
              >
                <span className="font-display text-[0.625rem] text-primary">{s.n}</span>
                <div>
                  <h2 className="text-base font-bold leading-snug sm:text-lg">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 text-base font-medium leading-relaxed sm:text-lg">
            No clutter. No unnecessary steps. Just a clean pipeline bringing the latest research
            straight to your screen.
          </p>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
