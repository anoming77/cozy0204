import { Link } from "@tanstack/react-router";
import { readingTime } from "@/lib/readingTime";
import { Lock, FileText, Star } from "lucide-react";

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
  is_featured?: boolean;
  categories?: { name: string; slug: string } | null;
};

const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23E8DFD0'/><text x='100' y='110' font-family='sans-serif' font-size='48' fill='%23C9A876' text-anchor='middle'>H</text></svg>";

export function PostCard({ post, featured }: { post: Post; featured?: boolean }) {
  const date = new Date(post.created_at).toLocaleDateString("ko-KR");
  const text = (post.content ?? "").replace(/<[^>]+>/g, "");
  const mins = readingTime(text || post.excerpt || "");
  return (
    <Link
      to="/post/$slug"
      params={{ slug: post.slug }}
      className={`group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md sm:flex-row sm:gap-4 ${
        featured ? "border-primary/40" : ""
      }`}
    >
      <img
        src={post.thumbnail_url || PLACEHOLDER}
        alt=""
        className="h-40 w-full flex-shrink-0 rounded object-cover sm:h-32 sm:w-32"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {featured && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
          {post.categories && (
            <span className="text-xs font-medium text-primary">{post.categories.name}</span>
          )}
          {post.status === "draft" && (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <FileText className="h-3 w-3" /> 임시저장
            </span>
          )}
          {post.status === "private" && (
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
              <Lock className="h-3 w-3" /> 나만 보기
            </span>
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
