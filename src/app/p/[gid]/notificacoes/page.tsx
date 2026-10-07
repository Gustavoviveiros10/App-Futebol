import Link from "next/link";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDayMonth, fmtTime } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { markAllRead } from "./actions";

export const metadata = { title: "Notificações" };

export default async function Notifications({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  const { user, group } = await getMembership(gid);
  const list = await db.notification.findMany({ where: { userId: user.id, groupId: gid }, orderBy: { createdAt: "desc" }, take: 50 });
  const unread = list.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notificações"
        back={`/p/${gid}`}
        action={
          unread > 0 ? (
            <form action={markAllRead.bind(null, gid)}>
              <SubmitButton className="btn-ghost btn-sm" pendingText="...">Marcar lidas</SubmitButton>
            </form>
          ) : undefined
        }
      />
      {list.length === 0 ? (
        <Empty icon="🔔" title="Nada por enquanto" text="Avisos de partidas, sorteios e cobranças aparecem aqui." />
      ) : (
        <div className="card divide-y divide-black/5 p-0">
          {list.map((n) => (
            <Link key={n.id} href={n.link ?? `/p/${gid}`} className={`flex gap-3 px-4 py-3 ${n.readAt ? "" : "bg-pitch-50/60"}`}>
              {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pitch-600" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="text-sm text-black/55">{n.body}</p>}
                <p className="mt-0.5 text-xs text-black/40">{fmtDayMonth(n.createdAt, group.timezone)} · {fmtTime(n.createdAt, group.timezone)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
