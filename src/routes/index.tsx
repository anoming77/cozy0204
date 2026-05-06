import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

type Post = Parameters<typeof PostCard>[0]["post"];

function Index() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("posts")
      .select("id, title, slug, excerpt, thumbnail_url, created_at, view_count, categories(name, slug)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPosts((data ?? []) as unknown as Post[]);
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
      <h1 className="mb-4 text-xl font-bold">최근 글</h1>
      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          아직 작성된 글이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </Layout>
  );
}
