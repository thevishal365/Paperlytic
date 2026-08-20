import { Link } from "@tanstack/react-router";

const navLinkClass =
  "text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground";

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
        <Link to="/" className="group flex items-baseline gap-3">
          <span className="font-display text-4xl leading-none tracking-tight">Paperlytic</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-primary sm:inline">
            live index
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/" className={navLinkClass} activeProps={{ className: "text-foreground" }}>
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
