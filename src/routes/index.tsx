import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hello world | 학습 아카이브" },
      { name: "description", content: "공부한 내용을 카테고리별로 정리하는 개인 학습 아카이브 'Hello world'." },
      { property: "og:title", content: "Hello world" },
      { property: "og:description", content: "공부한 내용을 카테고리별로 정리하는 개인 학습 아카이브" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

type Post = Parameters<typeof PostCard>[0]["post"];

function Index() {
  const [featured, setFeatured] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sel = "id, title, slug, excerpt, content, thumbnail_url, created_at, view_count, status, is_featured, categories(name, slug)";
    Promise.all([
      supabase.from("posts").select(sel).eq("status", "published").eq("is_featured", true).order("updated_at", { ascending: false }).limit(3),
      supabase.from("posts").select(sel).eq("status", "published").order("created_at", { ascending: false }),
    ]).then(([f, all]) => {
      setFeatured((f.data ?? []) as unknown as Post[]);
      setPosts((all.data ?? []) as unknown as Post[]);
      setLoading(false);
    });
  }, []);

  return (
    <Layout>
      {featured.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Star className="h-5 w-5 fill-primary text-primary" /> 대표글
          </h2>
          <div className="space-y-3 rounded-lg border-2 border-accent bg-accent/30 p-3">
            {featured.map((p) => <PostCard key={p.id} post={p} featured />)}
          </div>
        </section>
      )}

      <h1 className="mb-4 text-xl font-bold">최근 글</h1>
      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="flex gap-4 rounded-lg border bg-card p-4">
              <Skeleton className="h-24 w-24 rounded sm:h-32 sm:w-32" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
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
