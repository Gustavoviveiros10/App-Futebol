import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { Empty, PageHeader } from "@/components/ui";
import { MatchCard } from "@/components/MatchCard";

export const metadata = { title: "Partidas" };

export default async function Matches({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  const { group, isOrganizer } = await getMembership(gid);
  const include = {
    teams: { orderBy: { order: "asc" as const } },
    mvp: { select: { name: true, nickname: true } },
    _count: { select: { players: { where: { status: "CONFIRMED" as const } } } },
  };
  const [upcoming, past] = await Promise.all([
    db.match.findMany({ where: { groupId: gid, status: { in: ["SCHEDULED", "CLOSED", "DRAWN"] } }, orderBy: { date: "asc" }, include }),
    db.match.findMany({ where: { groupId: gid, status: { in: ["FINISHED", "CANCELED"] } }, orderBy: { date: "desc" }, take: 30, include }),
  ]);

  const card = (m: (typeof upcoming)[number]) => (
    <MatchCard
      key={m.id}
      href={`/p/${gid}/partidas/${m.id}`}
      date={m.date}
      location={m.location}
      status={m.status}
      tz={group.timezone}
      confirmed={m._count.players}
      max={m.maxPlayers}
      teams={m.teams}
      mvp={m.mvp ? m.mvp.nickname || m.mvp.name : null}
    />
  );

  return (
    <>
      <PageHeader
        title="Partidas"
        action={
          isOrganizer ? (
            <Link href={`/p/${gid}/partidas/nova`} className="btn-primary btn-sm">
              <Plus size={18} /> Nova
            </Link>
          ) : undefined
        }
      />
      {upcoming.length === 0 && past.length === 0 ? (
        <Empty icon="📅" title="Nenhuma partida ainda" text={isOrganizer ? "Crie a próxima pelada e mande o link no grupo." : "Quando o organizador marcar a próxima, ela aparece aqui."}>
          {isOrganizer && <Link href={`/p/${gid}/partidas/nova`} className="btn-primary">Criar partida</Link>}
        </Empty>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <p className="section-title">Próximas</p>
              <div className="mb-6 flex flex-col gap-3">{upcoming.map(card)}</div>
            </>
          )}
          {past.length > 0 && (
            <>
              <p className="section-title">Histórico</p>
              <div className="flex flex-col gap-3">{past.map(card)}</div>
            </>
          )}
        </>
      )}
    </>
  );
}
