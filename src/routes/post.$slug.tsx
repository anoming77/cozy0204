import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, getSessionId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Star, Lock, ShieldCheck } from "lucide-react";
import { readingTime } from "@/lib/readingTime";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  status: string;
  is_featured: boolean;
  categories: { name: string; slug: string } | null;
};

type Comment = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  author_role: string | null;
};

const REACTIONS = [
  { type: "like", emoji: "👍", label: "좋아요" },
  { type: "empathy", emoji: "🥹", label: "공감" },
  { type: "cheer", emoji: "💪", label: "응원" },
  { type: "helpful", emoji: "💡", label: "도움됐어요" },
] as const;

function PostDetail() {
  const { slug } = Route.useParams();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [notFound, setNotFound] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmUnfeature, setConfirmUnfeature] = useState(false);

  const sessionId = getSessionId();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, content, created_at, view_count, thumbnail_url, status, is_featured, categories(name, slug)")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) { setNotFound(true); return; }
      setPost(data as unknown as Post);
      await supabase.rpc("increment_view_count", { _post_id: data.id });
      loadComments(data.id);
      loadReactions(data.id);
    })();
  }, [slug]);

  async function loadComments(postId: string) {
    const { data } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    setComments((data ?? []) as Comment[]);
  }

  async function loadReactions(postId: string) {
    const { data } = await supabase.from("reactions").select("type, session_id").eq("post_id", postId);
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    (data ?? []).forEach((r) => {
      counts[r.type] = (counts[r.type] ?? 0) + 1;
      if (r.session_id === sessionId) mine.add(r.type);
    });
    setReactionCounts(counts); setMyReactions(mine);
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
    if (!post) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("삭제되었습니다");
    navigate({ to: "/" });
  }

  async function toggleFeatured() {
    if (!post) return;
    if (post.is_featured) { setConfirmUnfeature(true); return; }
    const { error } = await supabase.from("posts").update({ is_featured: true }).eq("id", post.id);
    if (error) return toast.error(error.message);
    setPost({ ...post, is_featured: true });
    toast.success("대표글로 설정되었습니다 (최대 3개)");
  }
  async function unfeature() {
    if (!post) return;
    const { error } = await supabase.from("posts").update({ is_featured: false }).eq("id", post.id);
    setConfirmUnfeature(false);
    if (error) return toast.error(error.message);
    setPost({ ...post, is_featured: false });
    toast.success("대표글에서 해제되었습니다");
  }

  const mins = post ? readingTime((post.content || "").replace(/<[^>]+>/g, "")) : 0;

  if (notFound) return <Layout><p>글을 찾을 수 없습니다.</p></Layout>;
  if (!post) return <Layout><p className="text-muted-foreground">불러오는 중...</p></Layout>;

  return (
    <Layout>
      <article className="rounded-lg border bg-card p-4 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {post.categories && (
            <Link to="/category/$slug" params={{ slug: post.categories.slug }} className="text-sm font-medium text-primary">
              {post.categories.name}
            </Link>
          )}
          {post.is_featured && (
            <span className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              <Star className="h-3 w-3 fill-current" /> 대표글
            </span>
          )}
          {post.status === "draft" && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">임시저장 (관리자만 보임)</span>
          )}
          {post.status === "private" && (
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              <Lock className="h-3 w-3" /> 나만 보기
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{new Date(post.created_at).toLocaleString("ko-KR")} · 약 {mins}분 읽기 · 조회 {post.view_count}</span>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={toggleFeatured}>
                <Star className={`h-4 w-4 ${post.is_featured ? "fill-primary text-primary" : ""}`} />
                {post.is_featured ? "대표글 해제" : "대표글 설정"}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/edit/$id" params={{ id: post.id }}>수정</Link>
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmDel(true)}>삭제</Button>
            </div>
          )}
        </div>

        <div className="prose-blog mt-6" dangerouslySetInnerHTML={{ __html: post.content }} />

        <div className="mt-8 flex flex-wrap gap-2 border-t pt-6">
          {REACTIONS.map((r) => (
            <button key={r.type} onClick={() => toggleReaction(r.type)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
                myReactions.has(r.type) ? "border-primary bg-accent text-accent-foreground" : "bg-background hover:bg-accent"
              }`}>
              <span className="text-base">{r.emoji}</span>
              <span>{r.label}</span>
              <span className="font-semibold">{reactionCounts[r.type] ?? 0}</span>
            </button>
          ))}
        </div>
      </article>

      <CommentSection postId={post.id} comments={comments} reload={() => loadComments(post.id)} isAdmin={isAdmin} userId={user?.id ?? null} />

      <ConfirmDialog open={confirmDel} onOpenChange={setConfirmDel}
        title="정말 삭제하시겠습니까?" description="되돌릴 수 없습니다." onConfirm={deletePost} />
      <ConfirmDialog open={confirmUnfeature} onOpenChange={setConfirmUnfeature}
        title="대표글에서 해제하시겠습니까?" description="홈 대표글 영역에서 즉시 사라집니다."
        confirmText="해제" onConfirm={unfeature} />
    </Layout>
  );
}

function CommentSection({ postId, comments, reload, isAdmin, userId }: {
  postId: string; comments: Comment[]; reload: () => void; isAdmin: boolean; userId: string | null;
}) {
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyNick, setReplyNick] = useState("");
  const [delId, setDelId] = useState<string | null>(null);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) return;
    const { error } = await supabase.from("comments").insert({
      post_id: postId, nickname: nickname.trim(), content: content.trim(),
      user_id: isAdmin ? userId : null, author_role: isAdmin ? "admin" : null,
    });
    if (error) return toast.error(error.message);
    setContent(""); reload();
  };

  const submitReply = async (parentId: string) => {
    if (!replyNick.trim() || !replyText.trim()) return;
    const { error } = await supabase.from("comments").insert({
      post_id: postId, parent_id: parentId,
      nickname: replyNick.trim(), content: replyText.trim(),
      user_id: isAdmin ? userId : null, author_role: isAdmin ? "admin" : null,
    });
    if (error) return toast.error(error.message);
    setReplyText(""); setReplyNick(""); setReplyTo(null);
    reload();
  };

  const del = async () => {
    if (!delId) return;
    const { error } = await supabase.from("comments").delete().eq("id", delId);
    if (error) return toast.error(error.message);
    setDelId(null); reload();
  };

  const roots = comments.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <section className="mt-6 rounded-lg border bg-card p-4 sm:p-6">
      <h3 className="mb-4 font-semibold">댓글 {comments.length}</h3>
      <ul className="space-y-4">
        {roots.map((c) => (
          <li key={c.id} className="border-b pb-3 last:border-0">
            <CommentItem c={c} isAdmin={isAdmin} onDelete={(id) => setDelId(id)} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} />
            <ul className="mt-3 space-y-3 pl-6 border-l-2">
              {childrenOf(c.id).map((rc) => (
                <li key={rc.id}>
                  <CommentItem c={rc} isAdmin={isAdmin} onDelete={(id) => setDelId(id)} />
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
        <Input placeholder={isAdmin ? "닉네임 (관리자로 표시됩니다)" : "닉네임"} value={nickname} onChange={(e) => setNickname(e.target.value)} className="max-w-xs" required />
        <Textarea placeholder="댓글을 입력하세요" value={content} onChange={(e) => setContent(e.target.value)} required rows={3} />
        <Button type="submit">댓글 등록</Button>
      </form>

      <ConfirmDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}
        title="댓글을 삭제하시겠습니까?" description="되돌릴 수 없습니다." onConfirm={del} />
    </section>
  );
}

function CommentItem({ c, isAdmin, onDelete, onReply }: {
  c: Comment; isAdmin: boolean; onDelete: (id: string) => void; onReply?: () => void;
}) {
  const isAdminComment = c.author_role === "admin";
  return (
    <div className={isAdminComment ? "rounded-md border-l-4 border-primary bg-accent/30 px-3 py-2" : ""}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {c.nickname}
          {isAdminComment && (
            <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <ShieldCheck className="h-3 w-3" /> 관리자
            </span>
          )}
        </span>
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
