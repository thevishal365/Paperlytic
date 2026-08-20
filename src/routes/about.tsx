import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

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
    body: "The system constantly pulls raw records from the Crossref API, a global registry of newly published academic work.",
  },
  {
    n: "02",
    title: "The engine",
    body: "A serverless worker runs autonomously every hour: it fetches new papers, filters duplicate DOIs, and normalises the data before it moves on.",
  },
  {
    n: "03",
    title: "The store",
    body: "Clean records land in a Postgres database. A daily background job prunes the oldest rows once storage limits are reached, keeping the index light.",
  },
  {
    n: "04",
    title: "The interface",
    body: "The frontend talks to the database directly, with no middleman server — live search, infinite scroll, and direct DOI links to every paper.",
  },
];

function About() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">{"\n"}</p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
          An automated, real-time feed of the latest academic research.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Paperlytic tracks and aggregates newly registered papers across physics, biology,
          medicine, computer science and beyond — refreshed hourly, with nothing between you and the
          source.
        </p>

        <ol className="mt-12 border-t border-rule">
          {steps.map((s) => (
            <li
              key={s.n}
              className="grid gap-2 border-b border-rule py-6 sm:grid-cols-[auto_1fr] sm:gap-8"
            >
              <span className="font-mono text-xs text-primary">{s.n}</span>
              <div>
                <h2 className="font-display text-2xl leading-snug">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 font-display text-xl leading-relaxed">
          No clutter. No unnecessary steps. Just a clean pipeline bringing the latest research
          straight to your screen.
        </p>
      </main>
    </div>
  );
}
