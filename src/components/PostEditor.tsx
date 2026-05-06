import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Category = { id: string; name: string };

export function PostEditor({ postId }: { postId?: string }) {
  const navigate = useNavigate();
  const [cats, setCats] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");

  useEffect(() => {
    supabase.from("categories").select("id, name").order("sort_order").then(({ data }) => {
      const list = (data ?? []).filter((c) => c.id);
      setCats(list);
      if (!postId && list[0]) setCategoryId(list[0].id);
    });
    if (postId) {
      supabase.from("posts").select("*").eq("id", postId).maybeSingle().then(({ data }) => {
        if (!data) return;
        setTitle(data.title); setSlug(data.slug); setExcerpt(data.excerpt ?? "");
        setContent(data.content); setThumbnail(data.thumbnail_url ?? "");
        setCategoryId(data.category_id ?? "");
      });
    }
  }, [postId]);

  function autoSlug(t: string) {
    const s = t.toLowerCase().trim()
      .replace(/[^\w가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);
    return s || `post-${Date.now()}`;
  }

  const save = async () => {
    if (!title.trim()) return toast.error("제목을 입력하세요");
    setSaving(true);
    const finalSlug = slug.trim() || autoSlug(title);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      title: title.trim(),
      slug: finalSlug,
      excerpt: excerpt.trim() || null,
      content,
      thumbnail_url: thumbnail.trim() || null,
      category_id: categoryId || null,
      author_id: user?.id ?? null,
    };

    const { error, data } = postId
      ? await supabase.from("posts").update(payload).eq("id", postId).select().single()
      : await supabase.from("posts").insert(payload).select().single();

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(postId ? "수정되었습니다" : "발행되었습니다");
    navigate({ to: "/post/$slug", params: { slug: data.slug } });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <h1 className="text-xl font-bold">{postId ? "글 수정" : "새 글 작성"}</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>제목</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
        </div>
        <div className="space-y-1.5">
          <Label>슬러그 (URL)</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="자동 생성됨" />
        </div>
        <div className="space-y-1.5">
          <Label>카테고리</Label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">선택</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>썸네일 URL</Label>
          <Input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>요약</Label>
          <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex gap-1 border-b">
          <button onClick={() => setTab("write")} className={`px-4 py-2 text-sm ${tab === "write" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>작성</button>
          <button onClick={() => setTab("preview")} className={`px-4 py-2 text-sm ${tab === "preview" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>미리보기</button>
        </div>
        {tab === "write" ? (
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20} className="font-mono text-sm" placeholder="마크다운으로 작성하세요..." />
        ) : (
          <div className="prose-blog min-h-[400px] rounded-md border bg-background p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*미리보기 내용이 여기에 표시됩니다*"}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => history.back()}>취소</Button>
        <Button onClick={save} disabled={saving}>{saving ? "저장 중..." : postId ? "수정 완료" : "발행"}</Button>
      </div>
    </div>
  );
}
