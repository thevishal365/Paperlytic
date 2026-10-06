import { createFileRoute } from "@tanstack/react-router";

import { MobileNav } from "@/components/MobileNav";
import { SiteHeader } from "@/components/SiteHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Paperlytic" },
      { name: "description", content: "Manage your Paperlytic Google account." },
      { property: "og:title", content: "Profile — Paperlytic" },
      { property: "og:description", content: "Manage your Paperlytic Google account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function getText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatAccountDate(value: string | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function ProfilePage() {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();
  const fullName =
    getText(user?.user_metadata["full_name"]) ?? getText(user?.user_metadata["name"]);
  const email = getText(user?.email);
  const avatarUrl =
    getText(user?.user_metadata["avatar_url"]) ?? getText(user?.user_metadata["picture"]);
  const initial = (fullName ?? email ?? "?").charAt(0).toUpperCase();
  const emailVerified = Boolean(user?.email_confirmed_at);
  const provider = getText(user?.app_metadata["provider"]);
  const providerName = provider
    ? provider === "google"
      ? "Google"
      : provider.charAt(0).toUpperCase() + provider.slice(1)
    : "Google";

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground sm:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-card shadow-sm">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-6">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading profile…</p>
          ) : user ? (
            <div className="flex flex-col items-center">
              <Avatar className="size-24 border-2 border-background shadow-sm ring-1 ring-border">
                <AvatarImage
                  src={avatarUrl}
                  alt={fullName ? `${fullName}'s profile photo` : "Profile photo"}
                />
                <AvatarFallback className="text-2xl font-medium">{initial}</AvatarFallback>
              </Avatar>
              {fullName && <h1 className="mt-4 text-center text-2xl font-bold">{fullName}</h1>}

              <section
                aria-labelledby="account-heading"
                className="mt-8 w-full rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
              >
                <div className="text-center">
                  <p className="font-display text-[0.6875rem] uppercase text-primary">Account</p>
                  <h2 id="account-heading" className="mt-1 text-lg font-semibold">
                    Sign-in &amp; identity
                  </h2>
                </div>

                <dl className="mt-6">
                  <div className="flex items-center justify-between gap-4 py-4">
                    <dt className="shrink-0 text-sm text-muted-foreground">Status</dt>
                    <dd className="rounded-full bg-accent px-2.5 py-1 font-display text-[0.625rem] font-bold uppercase text-primary">
                      Signed in
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border py-4">
                    <dt className="shrink-0 text-sm text-muted-foreground">Provider</dt>
                    <dd className="text-right text-sm font-medium">{providerName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 border-t border-border py-4">
                    <dt className="shrink-0 pt-0.5 text-sm text-muted-foreground">Email</dt>
                    <dd className="flex min-w-0 flex-col items-end gap-1.5 text-right sm:flex-row sm:items-center sm:justify-end">
                      {email && <span className="break-all text-sm font-medium">{email}</span>}
                      {emailVerified && (
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-display text-[0.5625rem] font-bold uppercase text-secondary-foreground">
                          Verified
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border py-4">
                    <dt className="shrink-0 text-sm text-muted-foreground">Account created</dt>
                    <dd className="text-right text-sm font-medium">
                      {formatAccountDate(user.created_at)}
                    </dd>
                  </div>
                </dl>

                <div className="flex justify-center border-t border-border pt-5">
                  <Button variant="outline" onClick={() => void signOut()}>
                    Sign Out
                  </Button>
                </div>
              </section>
            </div>
          ) : (
            <section
              aria-labelledby="account-heading"
              className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center sm:py-24"
            >
              <h1
                id="account-heading"
                className="font-display text-2xl font-bold leading-none sm:text-3xl"
              >
                Paperlytic
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Sign in to save papers and sync your library.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="mt-8 h-12 w-full max-w-sm rounded-full px-8 text-sm font-medium"
                onClick={() => void signInWithGoogle("/profile")}
              >
                <GoogleMark />
                Continue with Google
              </Button>
            </section>
          )}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
