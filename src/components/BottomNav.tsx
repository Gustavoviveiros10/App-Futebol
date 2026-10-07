"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, Users, Wallet } from "lucide-react";

export function BottomNav({ gid }: { gid: string }) {
  const path = usePathname();
  const base = `/p/${gid}`;
  const items = [
    { href: base, label: "Início", icon: Home, exact: true },
    { href: `${base}/partidas`, label: "Partidas", icon: CalendarDays },
    { href: `${base}/jogadores`, label: "Jogadores", icon: Users },
    { href: `${base}/rankings`, label: "Rankings", icon: BarChart3 },
    { href: `${base}/financeiro`, label: "Financeiro", icon: Wallet },
  ];
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 pb-1 pt-2 text-[11px] font-semibold ${active ? "text-pitch-700" : "text-black/45"}`}>
              <span className={`rounded-full px-4 py-1 transition ${active ? "bg-pitch-100" : ""}`}>
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
