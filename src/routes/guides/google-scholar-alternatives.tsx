import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

const TITLE = "The Best Google Scholar Alternatives for Real-Time Research";
const DESCRIPTION =
  "Compare the best Google Scholar alternatives for live research — Semantic Scholar, ResearchGate, PubMed, and Paperlytic's hourly paper feed.";
const URL = "https://paperlytic.netlify.app/guides/google-scholar-alternatives";

export const Route = createFileRoute("/guides/google-scholar-alternatives")({
  head: () => ({
    meta: [
      { title: "Google Scholar Alternatives for Research" },
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
    title: "Why researchers look beyond Google Scholar",
    body: "Google Scholar is the default for citation searches and older literature, but its index refreshes slowly and ranks by influence rather than recency. When you need to catch new papers as they appear, a dedicated alternative can close the gap.",
  },
  {
    n: "02",
    title: "Semantic Scholar: AI summaries and citation graphs",
    body: "Semantic Scholar uses machine learning to extract key figures, methods, and influential citations. It is excellent for understanding a paper quickly and tracing its academic lineage, though its live update cycle still depends on publisher feeds.",
  },
  {
    n: "03",
    title: "ResearchGate: access to authors and full texts",
    body: "ResearchGate excels at connecting authors and surfacing preprints or author-uploaded PDFs. Its social layer makes it useful for asking questions and finding collaborators, but the search experience is noisy and not designed for chronological monitoring.",
  },
  {
    n: "04",
    title: "PubMed: the gold standard for biomedical depth",
    body: "For medicine and life sciences, PubMed's MeSH indexing and curated metadata are hard to beat. It is precise and authoritative, yet it is scoped to one domain and new records wait on curation before they are searchable.",
  },
  {
    n: "05",
    title: "Paperlytic: an hourly feed of new publications",
    body: "Paperlytic reads directly from Crossref, the DOI registry where papers are recorded the moment they are published. The feed refreshes every hour, lists work in publication order, and links straight to each DOI — no algorithmic ranking, no stale results.",
  },
  {
    n: "06",
    title: "Choosing the right tool for your workflow",
    body: "Use Scholar for deep citation searches, Semantic Scholar for quick paper understanding, ResearchGate for author-sourced PDFs, and PubMed for biomedical precision. Layer Paperlytic on top for a real-time sweep of everything newly published across disciplines.",
  },
];

function Guide() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Guide</p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{TITLE}</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Google Scholar is the best-known research search engine, but it is not the fastest way to
          find new work. Compare the strongest alternatives and see how an hourly feed fits the
          stack.
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
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 font-display text-xl leading-relaxed">
          See the live feed in action —{" "}
          <Link to="/" className="text-primary underline underline-offset-4">
            today's newest papers
          </Link>{" "}
          are already indexed.
        </p>
      </main>
    </div>
  );
}
