import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { MobileNav } from "@/components/MobileNav";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type BookmarkRow = {
  id: string;
  doi: string;
  title: string;
  journal: string | null;
  published_date: string | null;
};

export const Route = createFileRoute("/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks — Paperlytic" },
      { name: "description", content: "Your saved academic papers on Paperlytic." },
      { property: "og:title", content: "Bookmarks — Paperlytic" },
      { property: "og:description", content: "Your saved academic papers on Paperlytic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user, isLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void supabase
      .from("bookmarks")
      .select("id, doi, title, journal, published_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBookmarks(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (!error) setBookmarks((items) => items.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground sm:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-card shadow-sm">
        <SiteHeader />
        <main className="px-4 py-5 sm:px-6 sm:py-6">
          <p className="font-display text-[0.6875rem] uppercase text-primary">Your library</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">Bookmarks</h1>
          {loading || isLoading ? (
            <p className="py-12 text-sm text-muted-foreground">Loading bookmarks…</p>
          ) : bookmarks.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
              No bookmarked papers yet.
            </p>
          ) : (
            <ol className="mt-6 space-y-3">
              {bookmarks.map((item) => (
                <li
                  key={item.id}
                  className="rise rounded-2xl border border-border bg-card p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="max-w-[75%] truncate rounded bg-accent px-2 py-1 font-display text-[0.625rem] font-bold uppercase text-primary">
                      {item.journal || "Independent research"}
                    </span>
                  </div>
                  <h2 className="text-base font-bold leading-snug text-card-foreground sm:text-lg">
                    {item.title}
                  </h2>
                  <p className="mt-3 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate">{item.doi}</span>
                  </p>
                  <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                    <Button variant="ghost" size="sm" onClick={() => void remove(item.id)}>
                      Remove
                    </Button>
                    <Button asChild variant="feed" size="sm">
                      <a href={`https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">
                        View paper
                        <ExternalLink />
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
