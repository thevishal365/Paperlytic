import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

const TITLE = "How to Track New Research Papers in Real Time";
const DESCRIPTION =
  "Automated research feeds vs. manual Google Scholar and PubMed searches — why hourly indexing beats a paper search engine you re-check by hand.";
const URL = "https://paperlytic.netlify.app/guides/tracking-new-research";

export const Route = createFileRoute("/guides/tracking-new-research")({
  head: () => ({
    meta: [
      { title: "Track New Research Papers in Real Time — Paperlytic" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          mainEntityOfPage: URL,
          datePublished: "2026-08-10",
          dateModified: "2026-08-10",
          image: "https://paperlytic.netlify.app/apple-touch-icon.png",
          author: { "@type": "Organization", name: "Paperlytic" },
          publisher: {
            "@type": "Organization",
            name: "Paperlytic",
            logo: {
              "@type": "ImageObject",
              url: "https://paperlytic.netlify.app/apple-touch-icon.png",
            },
          },
        }),
      },
    ],
  }),
  component: Guide,
});

const sections = [
  {
    n: "01",
    title: "Why manual searching lags behind",
    body: "Running the same query on a research paper search engine every morning means you only see what has already been indexed, ranked and surfaced. Between registration at the publisher and appearance in a general index, days can pass — and relevance ranking quietly buries anything published in the last few hours.",
  },
  {
    n: "02",
    title: "Google Scholar: broad, but slow to refresh",
    body: "Scholar is unbeatable for citation chasing and finding older, highly cited work. It is not built for recency: results are ordered by influence, alerts arrive irregularly, and brand-new records often show up only after they accumulate signals elsewhere.",
  },
  {
    n: "03",
    title: "PubMed: precise, but domain-bound",
    body: "PubMed's indexing and MeSH terms are excellent for biomedical literature, and its saved searches work well. But it covers one field, and records wait on curation before they are searchable — which is the opposite of what you want when you're monitoring a fast-moving topic.",
  },
  {
    n: "04",
    title: "Automated feeds: hourly, source-level indexing",
    body: "A feed reads directly from the registration layer — Crossref, where DOIs are minted the moment a paper is published. Paperlytic pulls that stream every hour, deduplicates by DOI, and lists each record in publication order rather than popularity order. New work appears the same day it exists.",
  },
  {
    n: "05",
    title: "A practical monitoring routine",
    body: "Keep one broad alert on a traditional index for citation depth, and use a live feed for the daily sweep: scan the newest entries, search by title or journal keyword, and open anything relevant straight through its DOI. Two passes, a few minutes, no missed week.",
  },
];

function Guide() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
          Guide
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
          {TITLE}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Most researchers still check a search engine by hand and hope nothing
          slipped through. Here's how automated feeds compare with manual
          searches on Google Scholar and PubMed — and how to combine them.
        </p>

        <ol className="mt-12 border-t border-rule">
          {sections.map((s) => (
            <li
              key={s.n}
              className="grid gap-2 border-b border-rule py-6 sm:grid-cols-[auto_1fr] sm:gap-8"
            >
              <span className="font-mono text-xs text-primary">{s.n}</span>
              <div>
                <h2 className="font-display text-2xl leading-snug">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 font-display text-xl leading-relaxed">
          Start with the live feed —{" "}
          <Link to="/" className="text-primary underline underline-offset-4">
            today's newly published papers
          </Link>{" "}
          are already there. Or compare the{" "}
          <Link
            to="/guides/google-scholar-alternatives"
            className="text-primary underline underline-offset-4"
          >
            best Google Scholar alternatives
          </Link>{" "}
          for your workflow.
        </p>
      </main>
    </div>
  );
}
