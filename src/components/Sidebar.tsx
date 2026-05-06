import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Folder, Clock, Eye, MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";

type Category = { id: string; name: string; slug: string; parent_id: string | null };
type RecentPost = { id: string; title: string; slug: string; created_at: string };

function slugify(name: string) {
  return name.toLowerCase().trim()
    .replace(/[^\w가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || `cat-${Date.now()}`;
}

export function Sidebar() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState<Category[]>([]);
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [visits, setVisits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function reload() {
    const [c, r] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("posts").select("id, title, slug, created_at")
        .eq("status", "published").order("created_at", { ascending: false }).limit(5),
    ]);
    setCats(c.data ?? []);
    setRecent(r.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    const total = parseInt(localStorage.getItem("visits_total") ?? "0", 10) + 1;
    localStorage.setItem("visits_total", String(total));
    setVisits(total);
  }, []);

  async function addCategory() {
    if (!newName.trim()) return;
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(), slug: slugify(newName), sort_order: cats.length,
    });
    if (error) return toast.error(error.message);
    setNewName(""); setAdding(false); reload();
  }

  async function renameCategory(id: string) {
    if (!editName.trim()) return;
    const { error } = await supabase.from("categories")
      .update({ name: editName.trim(), slug: slugify(editName) }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditing(null); reload();
  }

  async function delCategory() {
    if (!deleteId) return;
    const { error } = await supabase.from("categories").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("삭제되었습니다. 해당 글은 미분류로 이동되었습니다.");
    setDeleteId(null);
    reload();
    navigate({ to: "/" });
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Folder className="h-4 w-4 text-primary" /> 카테고리
          </h3>
          {isAdmin && (
            <button onClick={() => setAdding((v) => !v)} className="text-muted-foreground hover:text-primary" aria-label="추가">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {isAdmin && adding && (
          <div className="mb-2 flex gap-1">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="카테고리 이름"
              onKeyDown={(e) => e.key === "Enter" && addCategory()} className="h-8 text-sm" autoFocus />
            <Button size="sm" onClick={addCategory}>추가</Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-7 w-full" />)}</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {cats.map((c) => (
              <li key={c.id} className="group flex items-center">
                {editing === c.id ? (
                  <div className="flex w-full gap-1">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && renameCategory(c.id)}
                      className="h-7 text-sm" autoFocus />
                    <Button size="sm" variant="outline" onClick={() => renameCategory(c.id)}>저장</Button>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/category/$slug" params={{ slug: c.slug }}
                      className="flex-1 rounded px-2 py-1.5 hover:bg-accent"
                      activeProps={{ className: "bg-accent text-accent-foreground font-medium" }}
                    >
                      {c.name}
                    </Link>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 px-1 text-muted-foreground hover:text-primary">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(c.id); setEditName(c.name); }}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> 이름 수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                )}
              </li>
            ))}
            {cats.length === 0 && <li className="text-muted-foreground">카테고리가 없습니다</li>}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" /> 최근 글
        </h3>
        {loading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((p) => (
              <li key={p.id}>
                <Link to="/post/$slug" params={{ slug: p.slug }} className="line-clamp-2 text-muted-foreground hover:text-primary">
                  {p.title}
                </Link>
              </li>
            ))}
            {recent.length === 0 && <li className="text-muted-foreground">아직 글이 없습니다</li>}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <Eye className="h-4 w-4 text-primary" /> 방문자
        </h3>
        <p className="text-muted-foreground">누적 <span className="font-semibold text-foreground">{visits.toLocaleString()}</span></p>
      </section>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}
        title="카테고리를 삭제하시겠습니까?"
        description="해당 카테고리의 글은 미분류로 이동됩니다. 되돌릴 수 없습니다."
        onConfirm={delCategory}
      />
    </aside>
  );
}
