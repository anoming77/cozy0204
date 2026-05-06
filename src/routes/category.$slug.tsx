import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
});

type Post = Parameters<typeof PostCard>[0]["post"];

function CategoryPage() {
  const { slug } = Route.useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      const { data: cat } = await supabase.from("categories").select("id, name").eq("slug", slug).maybeSingle();
      if (!cat) return;
      setName(cat.name);
      const query = slug === "all"
        ? supabase.from("posts").select("id, title, slug, excerpt, thumbnail_url, created_at, view_count, categories(name, slug)").order("created_at", { ascending: false })
        : supabase.from("posts").select("id, title, slug, excerpt, thumbnail_url, created_at, view_count, categories(name, slug)").eq("category_id", cat.id).order("created_at", { ascending: false });
      const { data } = await query;
      setPosts((data ?? []) as unknown as Post[]);
    })();
  }, [slug]);

  return (
    <Layout>
      <h1 className="mb-4 text-xl font-bold">📁 {name}</h1>
      {posts.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">글이 없습니다.</div>
      ) : (
        <div className="space-y-3">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      )}
    </Layout>
  );
}
