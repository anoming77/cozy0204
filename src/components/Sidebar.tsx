import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Folder, Clock, Eye } from "lucide-react";

type Category = { id: string; name: string; slug: string; parent_id: string | null };
type RecentPost = { id: string; title: string; slug: string; created_at: string };

export function Sidebar() {
  const [cats, setCats] = useState<Category[]>([]);
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [visits, setVisits] = useState<number>(0);

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase
      .from("posts")
      .select("id, title, slug, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecent(data ?? []));

    // simple page visit counter (localStorage)
    const total = parseInt(localStorage.getItem("visits_total") ?? "0", 10) + 1;
    localStorage.setItem("visits_total", String(total));
    setVisits(total);
  }, []);

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Folder className="h-4 w-4 text-primary" /> 카테고리
        </h3>
        <ul className="space-y-1 text-sm">
          {cats.map((c) => (
            <li key={c.id}>
              <Link
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="block rounded px-2 py-1.5 hover:bg-muted"
                activeProps={{ className: "bg-accent text-accent-foreground font-medium" }}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" /> 최근 글
        </h3>
        <ul className="space-y-2 text-sm">
          {recent.map((p) => (
            <li key={p.id}>
              <Link
                to="/post/$slug"
                params={{ slug: p.slug }}
                className="line-clamp-2 text-muted-foreground hover:text-primary"
              >
                {p.title}
              </Link>
            </li>
          ))}
          {recent.length === 0 && <li className="text-muted-foreground">아직 글이 없습니다</li>}
        </ul>
      </section>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <Eye className="h-4 w-4 text-primary" /> 방문자
        </h3>
        <p className="text-muted-foreground">누적 <span className="font-semibold text-foreground">{visits.toLocaleString()}</span></p>
      </section>
    </aside>
  );
}
