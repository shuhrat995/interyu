"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/rbac";

type Props = {
  session: { name: string; email: string; role: Role };
  children: React.ReactNode;
};

type NavItem = { href: string; label: string; icon: string; roles: Role[] };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊", roles: ["super_admin", "admin", "recruiter", "editor", "viewer"] },
  { href: "/admin/interviews", label: "Intervyular", icon: "🎯", roles: ["super_admin", "admin", "recruiter", "viewer"] },
  { href: "/admin/analytics", label: "Analitika", icon: "📈", roles: ["super_admin", "admin", "recruiter", "viewer"] },
  { href: "/admin/questions", label: "Savollar", icon: "📝", roles: ["super_admin", "admin", "editor", "recruiter", "viewer"] },
  { href: "/admin/topics", label: "Mavzular", icon: "📚", roles: ["super_admin", "admin", "editor"] },
  { href: "/admin/audit", label: "Audit log", icon: "🗂", roles: ["super_admin", "admin"] }
];

export default function AdminShell({ session, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => n.roles.includes(session.role));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside
        className={`${open ? "block" : "hidden"} md:block md:w-56 shrink-0 bg-panel border-r border-line md:sticky md:top-0 md:h-screen`}
      >
        <div className="p-4 border-b border-line">
          <div className="font-semibold tracking-tight">AI Intervyu</div>
          <div className="text-xs text-mut">Admin panel · 1-bosqich</div>
        </div>
        <nav className="p-2 space-y-0.5" aria-label="Asosiy navigatsiya">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-acc/15 text-acc font-medium" : "text-mut hover:bg-panel2 hover:text-ink"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 mt-auto text-xs text-mut border-t border-line absolute bottom-0 md:w-56">
          <div className="font-medium text-ink">{session.name}</div>
          <div>{session.email}</div>
          <div className="mt-1">
            <span className="badge border-acc/40 text-acc">{ROLE_LABELS[session.role]}</span>
          </div>
          <button onClick={logout} className="btn-ghost mt-2 w-full justify-center text-xs">
            Chiqish
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between p-3 border-b border-line bg-panel">
          <span className="font-semibold">AI Intervyu</span>
          <button className="btn-ghost" onClick={() => setOpen((v) => !v)} aria-label="Menyu">
            ☰
          </button>
        </header>
        <main className="p-4 md:p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
