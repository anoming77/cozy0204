import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  cat: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: (s) => searchSchema.parse(s),
  component: SearchPage,
});

type Post = Parameters<typeof PostCard>[0]["post"];

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(params.q ?? "");
  const [from, setFrom] = useState(params.from ?? "");
  const [to, setTo] = useState(params.to ?? "");
  const [cat, setCat] = useState(params.cat ?? "");
  const [cats, setCats] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("id, name, slug").order("sort_order").then(({ data }) => setCats(data ?? []));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q1 = supabase
        .from("posts")
        .select("id, title, slug, excerpt, content, thumbnail_url, created_at, view_count, status, categories(name, slug)")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (params.q) q1 = q1.or(`title.ilike.%${params.q}%,content.ilike.%${params.q}%`);
      if (params.from) q1 = q1.gte("created_at", params.from);
      if (params.to) q1 = q1.lte("created_at", params.to + "T23:59:59");
      if (params.cat && params.cat !== "all") {
        const c = cats.find((x) => x.slug === params.cat);
        if (c) q1 = q1.eq("category_id", c.id);
      }

      const { data } = await q1;
      setPosts((data ?? []) as unknown as Post[]);
      setLoading(false);
    })();
  }, [params, cats]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q || undefined, from: from || undefined, to: to || undefined, cat: cat || undefined } });
  };

  return (
    <Layout>
      <h1 className="mb-4 text-xl font-bold">🔍 검색</h1>
      <form onSubmit={submit} className="mb-6 space-y-3 rounded-lg border bg-card p-4">
        <Input placeholder="검색어" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">시작일</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">종료일</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">카테고리</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">전체</option>
              {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit">검색</Button>
      </form>

      {loading ? (
        <p className="text-muted-foreground">검색 중...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">검색 결과가 없습니다.</div>
      ) : (
        <div className="space-y-3">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      )}
    </Layout>
  );
}
