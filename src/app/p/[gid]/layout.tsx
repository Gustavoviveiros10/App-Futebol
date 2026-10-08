import Link from "next/link";
import { Bell, ChevronDown, Settings } from "lucide-react";
import { getMembership } from "@/lib/tenancy";
import { db } from "@/lib/db";
import { BottomNav } from "@/components/BottomNav";
import { setViewMode } from "./view-actions";

export default async function GroupLayout({ children, params }: { children: React.ReactNode; params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  const { group, isOrganizer, canManage, viewMode, user } = await getMembership(gid);
  const unread = await db.notification.count({ where: { userId: user.id, groupId: gid, readAt: null } });

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <div className="sticky top-0 z-20 flex items-center gap-2 bg-bg/80 px-4 py-3 backdrop-blur-xl">
        <Link href="/app?todas=1" className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="pitch-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-base font-bold text-accent">{group.name.slice(0, 1).toUpperCase()}</span>
          <span className="truncate font-extrabold tracking-tight">{group.name}</span>
          <ChevronDown size={16} className="shrink-0 text-fg/40" />
        </Link>
        <Link href={`/p/${gid}/notificacoes`} className="relative rounded-full p-2 text-fg/60 hover:bg-fg/[0.06]" aria-label="Notificações">
          <Bell size={22} />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link href={`/p/${gid}/ajustes`} className="rounded-full p-2 text-fg/60 hover:bg-fg/[0.06]" aria-label={isOrganizer ? "Ajustes da pelada" : "Minha conta"}>
          <Settings size={22} />
        </Link>
      </div>
      {canManage && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 text-sm font-semibold ring-1 ring-fg/[0.07]" role="group" aria-label="Ver o app como">
            {(["organizador", "jogador"] as const).map((m) => (
              <form key={m} action={setViewMode.bind(null, gid, m)}>
                <button aria-pressed={viewMode === m} className={`w-full rounded-lg py-1.5 ${viewMode === m ? (m === "organizador" ? "bg-accent text-bg" : "bg-fg/10 text-fg") : "text-fg/50"}`}>
                  {m === "organizador" ? "Organizador" : "Jogador"}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
      <main className="px-4 pb-28">{children}</main>
      <BottomNav gid={gid} />
    </div>
  );
}
