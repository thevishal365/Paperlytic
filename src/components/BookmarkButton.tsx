import { useNavigate } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Article } from "@/lib/articles";

export function BookmarkButton({ article }: { article: Article }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const doi = article.doi ?? "";

  useEffect(() => {
    if (!user || !doi) {
      setSaved(false);
      return;
    }
    let active = true;
    void supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("doi", doi)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSaved(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [doi, user]);

  const toggle = async () => {
    // Wait until auth state is known: never treat a loading session as logged out.
    if (isLoading) return;
    // Bookmarking requires authentication, but the /bookmarks route itself
    // stays public — send logged-out users to the existing sign-in UI.
    if (!user) {
      await navigate({ to: "/profile" });
      return;
    }
    if (!doi || busy) return;
    setBusy(true);
    if (saved) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("doi", doi);
      if (!error) setSaved(false);
    } else {
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        doi,
        title: article.title || "Untitled",
        journal: article.journal || null,
        published_date: article.date || null,
      });
      if (!error) setSaved(true);
    }
    setBusy(false);
  };

  return (
    <Button
      type="button"
      size="icon"
      variant={saved ? "default" : "ghost"}
      disabled={!doi || busy}
      onClick={() => void toggle()}
      aria-label={saved ? "Remove bookmark" : "Bookmark paper"}
      title={saved ? "Remove bookmark" : "Bookmark paper"}
    >
      <Bookmark className={saved ? "fill-current" : undefined} />
    </Button>
  );
}
