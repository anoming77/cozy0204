import { Link } from "@tanstack/react-router";
import { readingTime } from "@/lib/readingTime";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string | null;
  thumbnail_url: string | null;
  created_at: string;
  view_count: number;
  status?: string;
  categories?: { name: string; slug: string } | null;
};

export function PostCard({ post }: { post: Post }) {
  const date = new Date(post.created_at).toLocaleDateString("ko-KR");
  const mins = readingTime(post.content ?? post.excerpt ?? "");
  return (
    <Link
      to="/post/$slug"
      params={{ slug: post.slug }}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md sm:flex-row sm:gap-4"
    >
      {post.thumbnail_url && (
        <img
          src={post.thumbnail_url}
          alt=""
          className="h-40 w-full flex-shrink-0 rounded object-cover sm:h-32 sm:w-32"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1 flex items-center gap-2">
          {post.categories && (
            <span className="text-xs font-medium text-primary">{post.categories.name}</span>
          )}
          {post.status === "draft" && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">임시저장</span>
          )}
        </div>
        <h2 className="text-base font-semibold text-foreground group-hover:text-primary sm:text-lg line-clamp-2">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-auto pt-2 text-xs text-muted-foreground">
          {date} · 약 {mins}분 읽기 · 조회 {post.view_count}
        </div>
      </div>
    </Link>
  );
}
