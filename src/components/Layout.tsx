import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { X } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setMobileOpen(true)} />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-background p-4 shadow-xl">
            <button className="mb-3 ml-auto block" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
