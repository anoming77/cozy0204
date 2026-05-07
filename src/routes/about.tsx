import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { RichEditor } from "@/components/RichEditor";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About | Hello world" },
      { name: "description", content: "Hello world 운영자 소개" },
      { property: "og:title", content: "About — Hello world" },
      { property: "og:description", content: "Hello world 운영자 소개와 연락 방법" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_pages").select("content").eq("slug", "about").maybeSingle().then(({ data }) => {
      const c = data?.content ?? "<p>이 공간은 학습 아카이브입니다. 운영자 소개를 자유롭게 수정해 주세요.</p>";
      setContent(c); setDraft(c);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_pages").update({ content: draft }).eq("slug", "about");
    setSaving(false);
    if (error) return toast.error(error.message);
    setContent(draft); setEditing(false);
    toast.success("저장되었습니다");
  };

  return (
    <Layout>
      <article className="rounded-lg border bg-card p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">About</h1>
          {isAdmin && !editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> 편집
            </Button>
          )}
        </div>
        {editing ? (
          <div className="space-y-3">
            <RichEditor value={draft} onChange={setDraft} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDraft(content); setEditing(false); }}>취소</Button>
              <Button onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            </div>
          </div>
        ) : (
          <div className="prose-blog" dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </article>
    </Layout>
  );
}
