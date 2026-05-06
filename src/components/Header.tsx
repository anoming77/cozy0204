import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, LogIn, LogOut, PenSquare, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/search", search: { q: q.trim() } });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <button className="lg:hidden" onClick={onMenuClick} aria-label="메뉴">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="text-lg font-bold text-primary whitespace-nowrap">
          📚 학습 아카이브
        </Link>
        <form onSubmit={onSearch} className="relative mx-auto hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background"
          />
        </form>
        <div className="ml-auto flex items-center gap-2">
          {isAdmin && (
            <Button asChild size="sm" variant="default">
              <Link to="/admin/new"><PenSquare className="h-4 w-4" />글쓰기</Link>
            </Button>
          )}
          {user ? (
            <Button size="sm" variant="ghost" onClick={logout}>
              <LogOut className="h-4 w-4" /> 로그아웃
            </Button>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link to="/login"><LogIn className="h-4 w-4" />로그인</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
