import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { readingTime } from "@/lib/readingTime";
import { RichEditor } from "./RichEditor";
import { ThumbnailUpload } from "./ThumbnailUpload";
import { Lock, Globe, FileText } from "lucide-react";

type Category = { id: string; name: string };
type Status = "draft" | "private" | "public";

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
  const [status, setStatus] = useState<Status>("draft");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(!initialPostId);

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
          const s = data.status as string;
          setStatus((s === "published" ? "public" : s) as Status);
        }
        setLoaded(true);
      });
    }
  }, [initialPostId]);

  function autoSlug(t: string) {
    const s = t.toLowerCase().trim().replace(/[^\w가-힣\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
    return s || `post-${Date.now()}`;
  }

  async function persist(nextStatus: Status): Promise<string | null> {
    if (!title.trim()) return null;
    const finalSlug = slug.trim() || autoSlug(title);
    const { data: { user } } = await supabase.auth.getUser();
    // map 'public' -> stored value 'published' for backwards compat
    const dbStatus = nextStatus === "public" ? "published" : nextStatus;
    const payload = {
      title: title.trim(), slug: finalSlug,
      excerpt: excerpt.trim() || null, content,
      thumbnail_url: thumbnail.trim() || null,
      category_id: categoryId || null, author_id: user?.id ?? null,
      status: dbStatus,
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

  // Auto-save: 1s debounce + 5s safety net
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded || !title.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { persist(status).catch(() => {}); }, 1000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, excerpt, content, thumbnail, categoryId, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(() => { if (title.trim()) persist(status).catch(() => {}); }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, title, status]);

  const submit = async (next: Status) => {
    if (!title.trim()) return toast.error("제목을 입력하세요");
    setSaving(true);
    const s = await persist(next);
    setStatus(next);
    setSaving(false);
    if (s) {
      toast.success(next === "public" ? "공개 발행되었습니다" : next === "private" ? "나만 보기로 저장되었습니다" : "임시저장되었습니다");
      if (next !== "draft") navigate({ to: "/post/$slug", params: { slug: s } });
    }
  };

  const statusBadge = status === "public"
    ? { label: "공개", icon: Globe, cls: "bg-accent text-accent-foreground" }
    : status === "private"
    ? { label: "나만 보기", icon: Lock, cls: "bg-secondary text-secondary-foreground" }
    : { label: "임시저장", icon: FileText, cls: "bg-muted text-muted-foreground" };
  const SBIcon = statusBadge.icon;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{initialPostId ? "글 수정" : "새 글 작성"}</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${statusBadge.cls}`}>
            <SBIcon className="h-3 w-3" /> {statusBadge.label}
          </span>
          {lastSaved && <span>자동저장 {lastSaved.toLocaleTimeString("ko-KR")}</span>}
          <span>약 {readingTime(content.replace(/<[^>]+>/g, ""))}분</span>
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
          <Label>썸네일</Label>
          <ThumbnailUpload value={thumbnail} onChange={setThumbnail} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>요약</Label>
          <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>본문</Label>
        <RichEditor value={content} onChange={setContent} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => history.back()}>취소</Button>
        <Button variant="outline" onClick={() => submit("draft")} disabled={saving}>
          <FileText className="h-4 w-4" /> 임시저장
        </Button>
        <Button variant="secondary" onClick={() => submit("private")} disabled={saving}>
          <Lock className="h-4 w-4" /> 나만 보기
        </Button>
        <Button onClick={() => submit("public")} disabled={saving}>
          <Globe className="h-4 w-4" /> {saving ? "저장 중..." : "공개"}
        </Button>
      </div>
    </div>
  );
}
