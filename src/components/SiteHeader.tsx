import { Link } from "@tanstack/react-router";

export const navTypographyClass =
  "text-xs uppercase tracking-[0.18em] text-muted-foreground";
export const navLinkClass = `${navTypographyClass} transition-colors hover:text-foreground`;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
        <Link
          to="/"
          resetScroll
          onClick={() => window.scrollTo(0, 0)}
          className="group flex items-baseline gap-3"
        >
          <span className="font-display text-4xl leading-none tracking-tight">Paperlytic</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            to="/"
            resetScroll
            onClick={() => window.scrollTo(0, 0)}
            className={navLinkClass}
            activeProps={{ className: "text-foreground" }}
          >
            Feed
          </Link>
          <Link to="/about" className={navLinkClass} activeProps={{ className: "text-foreground" }}>
            About
          </Link>
          <a href="mailto:vishaltenet@gmail.com" className={navLinkClass}>
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
