import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, getSessionId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/post/$slug")({
  component: PostDetail,
});

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  created_at: string;
  view_count: number;
  thumbnail_url: string | null;
  categories: { name: string; slug: string } | null;
};

type Comment = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  parent_id: string | null;
};

const REACTIONS = [
  { type: "like", emoji: "👍", label: "좋아요" },
  { type: "empathy", emoji: "🥹", label: "공감" },
  { type: "cheer", emoji: "💪", label: "응원" },
  { type: "helpful", emoji: "💡", label: "도움됐어요" },
] as const;

function PostDetail() {
  const { slug } = Route.useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [notFound, setNotFound] = useState(false);

  const sessionId = getSessionId();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, content, created_at, view_count, thumbnail_url, categories(name, slug)")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        return;
      }
      setPost(data as unknown as Post);
      await supabase.rpc("increment_view_count", { _post_id: data.id });
      loadComments(data.id);
      loadReactions(data.id);
    })();
  }, [slug]);

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  }

  async function loadReactions(postId: string) {
    const { data } = await supabase.from("reactions").select("type, session_id").eq("post_id", postId);
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    (data ?? []).forEach((r) => {
      counts[r.type] = (counts[r.type] ?? 0) + 1;
      if (r.session_id === sessionId) mine.add(r.type);
    });
    setReactionCounts(counts);
    setMyReactions(mine);
  }

  async function toggleReaction(type: string) {
    if (!post) return;
    if (myReactions.has(type)) {
      await supabase.from("reactions").delete().match({ post_id: post.id, session_id: sessionId, type });
    } else {
      await supabase.from("reactions").insert({ post_id: post.id, session_id: sessionId, type });
    }
    loadReactions(post.id);
  }

  async function deletePost() {
    if (!post || !confirm("정말 삭제하시겠어요?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("삭제되었습니다");
    navigate({ to: "/" });
  }

  if (notFound) return <Layout><p>글을 찾을 수 없습니다.</p></Layout>;
  if (!post) return <Layout><p className="text-muted-foreground">불러오는 중...</p></Layout>;

  return (
    <Layout>
      <article className="rounded-lg border bg-card p-6 sm:p-8">
        {post.categories && (
          <Link to="/category/$slug" params={{ slug: post.categories.slug }} className="text-sm font-medium text-primary">
            {post.categories.name}
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{post.title}</h1>
        <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>{new Date(post.created_at).toLocaleString("ko-KR")} · 조회 {post.view_count}</span>
          {isAdmin && (
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/edit/$id" params={{ id: post.id }}>수정</Link>
              </Button>
              <Button size="sm" variant="destructive" onClick={deletePost}>삭제</Button>
            </div>
          )}
        </div>

        <div className="prose-blog mt-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t pt-6">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={() => toggleReaction(r.type)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
                myReactions.has(r.type)
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <span className="text-base">{r.emoji}</span>
              <span>{r.label}</span>
              <span className="font-semibold">{reactionCounts[r.type] ?? 0}</span>
            </button>
          ))}
        </div>
      </article>

      <CommentSection postId={post.id} comments={comments} reload={() => loadComments(post.id)} isAdmin={isAdmin} />
    </Layout>
  );
}

function CommentSection({ postId, comments, reload, isAdmin }: {
  postId: string; comments: Comment[]; reload: () => void; isAdmin: boolean;
}) {
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyNick, setReplyNick] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) return;
    const { error } = await supabase.from("comments").insert({ post_id: postId, nickname: nickname.trim(), content: content.trim() });
    if (error) return toast.error(error.message);
    setContent("");
    reload();
  };

  const submitReply = async (parentId: string) => {
    if (!replyNick.trim() || !replyText.trim()) return;
    const { error } = await supabase.from("comments").insert({ post_id: postId, parent_id: parentId, nickname: replyNick.trim(), content: replyText.trim() });
    if (error) return toast.error(error.message);
    setReplyText(""); setReplyNick(""); setReplyTo(null);
    reload();
  };

  const del = async (id: string) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  const roots = comments.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <section className="mt-6 rounded-lg border bg-card p-6">
      <h3 className="mb-4 font-semibold">댓글 {comments.length}</h3>

      <ul className="space-y-4">
        {roots.map((c) => (
          <li key={c.id} className="border-b pb-3 last:border-0">
            <CommentItem c={c} isAdmin={isAdmin} onDelete={del} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} />
            <ul className="mt-3 space-y-3 pl-6 border-l-2">
              {childrenOf(c.id).map((rc) => (
                <li key={rc.id}>
                  <CommentItem c={rc} isAdmin={isAdmin} onDelete={del} />
                </li>
              ))}
            </ul>
            {replyTo === c.id && (
              <div className="mt-3 space-y-2 pl-6">
                <Input placeholder="닉네임" value={replyNick} onChange={(e) => setReplyNick(e.target.value)} className="max-w-xs" />
                <Textarea placeholder="답글 내용" value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} />
                <Button size="sm" onClick={() => submitReply(c.id)}>답글 등록</Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-6 space-y-2 border-t pt-4">
        <Input placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} className="max-w-xs" required />
        <Textarea placeholder="댓글을 입력하세요" value={content} onChange={(e) => setContent(e.target.value)} required rows={3} />
        <Button type="submit">댓글 등록</Button>
      </form>
    </section>
  );
}

function CommentItem({ c, isAdmin, onDelete, onReply }: {
  c: Comment; isAdmin: boolean; onDelete: (id: string) => void; onReply?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{c.nickname}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(c.created_at).toLocaleString("ko-KR")}</span>
          {onReply && <button onClick={onReply} className="hover:text-primary">답글</button>}
          {isAdmin && (
            <button onClick={() => onDelete(c.id)} className="text-destructive hover:opacity-70" aria-label="삭제">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
    </div>
  );
}
