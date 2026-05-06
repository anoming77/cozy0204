import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { readingTime } from "@/lib/readingTime";

type Category = { id: string; name: string };

export function PostEditor({ postId: initialPostId }: { postId?: string }) {
  const navigate = useNavigate();
  const [postId, setPostId] = useState<string | undefined>(initialPostId);
  const [cats, setCats] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(!!initialPostId ? false : true);

  const insertAtCursor = (text: string) => {
    const ta = document.getElementById("md-content") as HTMLTextAreaElement | null;
    if (!ta) { setContent((c) => c + "\n" + text + "\n"); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + text.length; }, 0);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file, {
      contentType: file.type, upsert: false,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    const url = data.publicUrl;
    if (file.type.startsWith("video/")) {
      insertAtCursor(`\n<video src="${url}" controls style="max-width:100%"></video>\n`);
    } else {
      insertAtCursor(`\n![](${url})\n`);
    }
    toast.success("업로드되었습니다");
  };

  const handleYoutube = () => {
    const url = prompt("YouTube URL을 입력하세요");
    if (!url) return;
    const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    const id = m?.[1];
    if (!id) return toast.error("YouTube URL을 인식할 수 없습니다");
    insertAtCursor(`\n<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen style="max-width:100%;aspect-ratio:16/9;width:100%;height:auto"></iframe>\n`);
  };

  useEffect(() => {
    supabase.from("categories").select("id, name").order("sort_order").then(({ data }) => {
      const list = (data ?? []).filter((c) => c.id);
      setCats(list);
      if (!initialPostId && list[0]) setCategoryId((cur) => cur || list[0].id);
    });
    if (initialPostId) {
      supabase.from("posts").select("*").eq("id", initialPostId).maybeSingle().then(({ data }) => {
        if (data) {
          setTitle(data.title); setSlug(data.slug); setExcerpt(data.excerpt ?? "");
          setContent(data.content); setThumbnail(data.thumbnail_url ?? "");
          setCategoryId(data.category_id ?? "");
          setStatus((data.status as "draft" | "published") ?? "published");
        }
        setLoaded(true);
      });
    }
  }, [initialPostId]);

  function autoSlug(t: string) {
    const s = t.toLowerCase().trim()
      .replace(/[^\w가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);
    return s || `post-${Date.now()}`;
  }

  async function persist(nextStatus: "draft" | "published"): Promise<string | null> {
    if (!title.trim()) return null;
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
      status: nextStatus,
    };
    const { data, error } = postId
      ? await supabase.from("posts").update(payload).eq("id", postId).select().single()
      : await supabase.from("posts").insert(payload).select().single();
    if (error) { toast.error(error.message); return null; }
    if (!postId && data) setPostId(data.id);
    if (data) setSlug(data.slug);
    setLastSaved(new Date());
    return data?.slug ?? null;
  }

  // Auto-save: 1s debounce after edits, also every 5s as safety net
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (!title.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Only autosave as draft if currently draft (don't downgrade published)
      persist(status).catch(() => {});
    }, 1000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, excerpt, content, thumbnail, categoryId, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      if (title.trim()) persist(status).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, title, status]);

  const publish = async () => {
    if (!title.trim()) return toast.error("제목을 입력하세요");
    setSaving(true);
    const s = await persist("published");
    setSaving(false);
    if (s) {
      setStatus("published");
      toast.success("발행되었습니다");
      navigate({ to: "/post/$slug", params: { slug: s } });
    }
  };

  const saveDraft = async () => {
    if (!title.trim()) return toast.error("제목을 입력하세요");
    setSaving(true);
    await persist("draft");
    setStatus("draft");
    setSaving(false);
    toast.success("임시저장되었습니다");
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{initialPostId ? "글 수정" : "새 글 작성"}</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`rounded px-2 py-0.5 ${status === "draft" ? "bg-muted" : "bg-accent text-accent-foreground"}`}>
            {status === "draft" ? "임시저장" : "발행됨"}
          </span>
          {lastSaved && <span>자동저장 {lastSaved.toLocaleTimeString("ko-KR")}</span>}
          <span>약 {readingTime(content)}분</span>
        </div>
      </div>

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
            <option value="">미분류</option>
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
        <div className="mb-2 flex flex-wrap items-center gap-1 border-b">
          <button type="button" onClick={() => setTab("write")} className={`px-4 py-2 text-sm ${tab === "write" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>작성</button>
          <button type="button" onClick={() => setTab("preview")} className={`px-4 py-2 text-sm ${tab === "preview" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>미리보기</button>
          <div className="ml-auto flex flex-wrap items-center gap-2 pb-2">
            <label className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent">
              {uploading ? "업로드 중..." : "📷 이미지"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
            </label>
            <label className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent">
              {uploading ? "업로드 중..." : "🎬 동영상"}
              <input type="file" accept="video/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
            </label>
            <button type="button" onClick={handleYoutube} className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent">▶ YouTube</button>
          </div>
        </div>
        {tab === "write" ? (
          <Textarea id="md-content" value={content} onChange={(e) => setContent(e.target.value)} rows={20} className="font-mono text-sm" placeholder="마크다운으로 작성하세요. 이미지·동영상은 위 버튼으로 첨부하세요." />
        ) : (
          <div className="prose-blog min-h-[400px] rounded-md border bg-background p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{content || "*미리보기 내용이 여기에 표시됩니다*"}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => history.back()}>취소</Button>
        <Button variant="outline" onClick={saveDraft} disabled={saving}>임시저장</Button>
        <Button onClick={publish} disabled={saving}>{saving ? "저장 중..." : "발행"}</Button>
      </div>
    </div>
  );
}
