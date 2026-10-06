import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark, Home, Info, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { label: "Feed", to: "/" as const, icon: Home },
  { label: "About", to: "/about" as const, icon: Info },
  { label: "Bookmarks", to: "/bookmarks" as const, icon: Bookmark },
  { label: "Profile", to: "/profile" as const, icon: UserRound },
];

export function MobileNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-16 max-w-3xl grid-cols-4 border-t border-border bg-card/95 px-2 backdrop-blur-lg sm:hidden"
    >
      {items.map(({ label, to, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors",
              active && "text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="truncate text-[0.625rem] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
