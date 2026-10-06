import { Link, useRouterState } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const navTypographyClass = "font-display text-[0.6875rem] uppercase text-muted-foreground";
export const navLinkClass =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

const navItems = [
  { label: "Feed", to: "/" as const },
  { label: "About", to: "/about" as const },
  { label: "Bookmarks", to: "/bookmarks" as const },
  { label: "Profile", to: "/profile" as const },
];

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user } = useAuth();
  const avatarUrl =
    typeof user?.user_metadata["avatar_url"] === "string"
      ? user.user_metadata["avatar_url"]
      : undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link
          to="/"
          resetScroll
          onClick={() => window.scrollTo(0, 0)}
          className="flex min-w-0 items-center gap-2"
        >
          <span className="font-display text-lg font-bold leading-none sm:text-xl">Paperlytic</span>
          <span className="h-2 w-2 rounded-full bg-signal" aria-label="Live feed" />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-6 sm:flex">
          {navItems.map(({ label, to }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                resetScroll
                aria-current={active ? "page" : undefined}
                className={cn(
                  navLinkClass,
                  "relative py-2",
                  active &&
                    "text-foreground after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-primary",
                )}
              >
                {label === "Profile" && user ? (
                  <span className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarImage src={avatarUrl} alt="" />
                      <AvatarFallback className="text-[0.625rem]">
                        {user.email?.slice(0, 1).toUpperCase() ?? "P"}
                      </AvatarFallback>
                    </Avatar>
                    Profile
                  </span>
                ) : (
                  label
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
