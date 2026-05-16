import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, LogIn, LogOut, PenSquare, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/search", search: { q: q.trim() } });
    setShowSearch(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 lg:grid lg:h-16 lg:grid-cols-[240px_1fr] lg:gap-6">
        <div className="flex items-center gap-2 lg:justify-center">
          <button className="lg:hidden" onClick={onMenuClick} aria-label="메뉴">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="text-3xl font-bold tracking-tight text-primary whitespace-nowrap leading-none md:text-2xl">
            Hello world
          </Link>
        </div>
        <div className="ml-auto flex flex-1 items-center gap-2 lg:ml-0 lg:flex-none">
        <form onSubmit={onSearch} className="relative hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background focus-visible:ring-primary"
          />
        </form>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button className="md:hidden p-2" onClick={() => setShowSearch((s) => !s)} aria-label="검색">
            {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <Link to="/about" className="hidden text-sm text-muted-foreground hover:text-primary sm:inline">About</Link>
          {isAdmin && (
            <Button asChild size="sm" variant="default">
              <Link to="/admin/new"><PenSquare className="h-4 w-4" />글쓰기</Link>
            </Button>
          )}
          {user ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirmLogout(true)}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">로그아웃</span>
            </Button>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link to="/login"><LogIn className="h-4 w-4" /><span className="hidden sm:inline">로그인</span></Link>
            </Button>
          )}
        </div>
        </div>
      </div>
      {showSearch && (
        <form onSubmit={onSearch} className="border-t bg-background px-4 py-2 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색어를 입력하세요" className="pl-9" />
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirmLogout} onOpenChange={setConfirmLogout}
        title="로그아웃 하시겠습니까?" description="되돌릴 수 없습니다."
        confirmText="로그아웃" onConfirm={logout}
      />
    </header>
  );
}
