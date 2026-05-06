import { Link } from "@tanstack/react-router";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  created_at: string;
  view_count: number;
  categories?: { name: string; slug: string } | null;
};

export function PostCard({ post }: { post: Post }) {
  const date = new Date(post.created_at).toLocaleDateString("ko-KR");
  return (
    <Link
      to="/post/$slug"
      params={{ slug: post.slug }}
      className="group flex gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
    >
      {post.thumbnail_url && (
        <img
          src={post.thumbnail_url}
          alt=""
          className="h-24 w-24 flex-shrink-0 rounded object-cover sm:h-32 sm:w-32"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {post.categories && (
          <span className="mb-1 text-xs font-medium text-primary">{post.categories.name}</span>
        )}
        <h2 className="text-base font-semibold text-foreground group-hover:text-primary sm:text-lg line-clamp-2">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-auto pt-2 text-xs text-muted-foreground">
          {date} · 조회 {post.view_count}
        </div>
      </div>
    </Link>
  );
}
