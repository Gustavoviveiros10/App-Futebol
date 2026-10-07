import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { POSITIONS, fmtDate, fmtRating, money } from "@/lib/format";
import { groupStats, teamOutcome } from "@/lib/stats";
import { paymentView, playerFinanceStatus } from "@/lib/finance";
import { Avatar, Badge, PageHeader, Stat } from "@/components/ui";
import { FinanceBadge } from "@/components/FinanceBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export default async function PlayerProfile({ params }: { params: Promise<{ gid: string; pid: string }> }) {
  const { gid, pid } = await params;
  const { isOrganizer, player: me, group } = await getMembership(gid);
  const p = await db.player.findFirst({ where: { id: pid, groupId: gid } });
  if (!p) notFound();
  const canSeeMoney = isOrganizer || me.id === p.id;

  const [[all], [season], recent, payments] = await Promise.all([
    groupStats(gid, "sempre", pid),
    groupStats(gid, "temporada", pid),
    db.matchPlayer.findMany({
      where: { playerId: pid, played: true, match: { status: "FINISHED" } },
      orderBy: { match: { date: "desc" } },
      take: 8,
      include: { match: { include: { teams: true } }, team: true },
    }),
    canSeeMoney ? db.payment.findMany({ where: { playerId: pid, status: { not: "CANCELED" } }, orderBy: { dueDate: "desc" }, take: 6 }) : Promise.resolve([]),
  ]);

  const s = all;
  const pos = POSITIONS[p.position];
  return (
    <>
      <PageHeader
        title=""
        back={`/p/${gid}/jogadores`}
        action={
          isOrganizer ? (
            <Link href={`/p/${gid}/jogadores/${pid}/editar`} className="btn-ghost btn-sm">
              <Pencil size={16} /> Editar
            </Link>
          ) : undefined
        }
      />
      <div className="pitch-gradient -mt-2 mb-4 flex flex-col items-center rounded-3xl px-4 pb-6 pt-6 text-center text-white">
        <Avatar name={p.name} photo={p.photo} size={88} className="ring-4 ring-white/20" />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{p.nickname || p.name}</h1>
        {p.nickname && <p className="text-sm text-white/60">{p.name}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <span className="chip bg-white/15">{pos.emoji} {pos.label}</span>
          <span className="chip bg-white/15">{p.billingType === "MONTHLY" ? "Mensalista" : "Avulso"}</span>
          {p.role === "ORGANIZER" && <span className="chip bg-lime-accent text-pitch-950">👑 Organizador</span>}
          {!p.active && <span className="chip bg-red-500/80">Inativo</span>}
        </div>
        <p className="mt-2 text-xs text-white/50">Na pelada desde {fmtDate(p.joinedAt, group.timezone)}</p>
      </div>

      <p className="section-title">Todos os tempos</p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Partidas" value={s?.games ?? 0} />
        <Stat label="Gols" value={s?.goals ?? 0} />
        <Stat label="Assistências" value={s?.assists ?? 0} />
        <Stat label="Vitórias" value={s?.wins ?? 0} tone="green" />
        <Stat label="Empates" value={s?.draws ?? 0} />
        <Stat label="Derrotas" value={s?.losses ?? 0} tone="red" />
        <Stat label="Média" value={fmtRating(s?.avgRating)} />
        <Stat label="Craque" value={`${s?.mvps ?? 0}x`} />
        {p.position === "GOALKEEPER" ? <Stat label="Defesas" value={s?.saves ?? 0} /> : <Stat label="Cartões" value={(s?.yellow ?? 0) + (s?.red ?? 0)} />}
      </div>

      {season && (
        <>
          <p className="section-title">Temporada atual</p>
          <div className="card mb-4 flex justify-around text-center">
            <div><p className="text-xl font-extrabold">{season.games}</p><p className="text-xs text-black/50">jogos</p></div>
            <div><p className="text-xl font-extrabold">{season.goals}</p><p className="text-xs text-black/50">gols</p></div>
            <div><p className="text-xl font-extrabold">{season.assists}</p><p className="text-xs text-black/50">assist.</p></div>
            <div><p className="text-xl font-extrabold">{fmtRating(season.avgRating)}</p><p className="text-xs text-black/50">média</p></div>
          </div>
        </>
      )}

      {isOrganizer && (
        <div className="card mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">Nível para o sorteio</p>
            <p className="text-xs text-black/45">Só organizadores veem</p>
          </div>
          <span className="text-2xl font-black text-pitch-700">{p.skill}/10</span>
        </div>
      )}

      {recent.length > 0 && (
        <>
          <p className="section-title">Últimas partidas</p>
          <div className="card mb-4 divide-y divide-black/5 p-0">
            {recent.map((mp) => {
              const o = teamOutcome(mp.match.teams, mp.teamId);
              return (
                <Link key={mp.id} href={`/p/${gid}/partidas/${mp.matchId}`} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${o === "W" ? "bg-pitch-100 text-pitch-800" : o === "L" ? "bg-red-100 text-red-700" : "bg-black/5 text-black/60"}`}>
                    {o === "W" ? "V" : o === "L" ? "D" : o === "D" ? "E" : "–"}
                  </span>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{fmtDate(mp.match.date, group.timezone)}</p>
                    <p className="text-black/50">{mp.team?.name ?? "Sem time"}</p>
                  </div>
                  <div className="text-right text-sm">
                    {mp.goals > 0 && <span className="mr-2">⚽ {mp.goals}</span>}
                    {mp.assists > 0 && <span className="mr-2">🎯 {mp.assists}</span>}
                    {mp.match.mvpPlayerId === p.id && <span className="mr-2">🏆</span>}
                    {mp.rating != null && <Badge tone="dark">{fmtRating(mp.rating)}</Badge>}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {canSeeMoney && (
        <>
          <div className="flex items-center justify-between">
            <p className="section-title">Financeiro</p>
            <FinanceBadge status={playerFinanceStatus(payments)} />
          </div>
          <div className="card mb-4 divide-y divide-black/5 p-0">
            {payments.length === 0 && <p className="px-4 py-4 text-sm text-black/50">Nenhuma cobrança.</p>}
            {payments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{pay.description ?? (pay.type === "MONTHLY" ? "Mensalidade" : "Avulso")}{pay.reference ? ` ${pay.reference.split("-").reverse().join("/")}` : ""}</p>
                  <p className="text-black/50">Vence {fmtDate(pay.dueDate, group.timezone)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{money(pay.amountCents)}</span>
                  <FinanceBadge status={paymentView(pay)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isOrganizer && p.phone && <WhatsAppButton text={`Fala, ${p.nickname || p.name.split(" ")[0]}! `} phone={p.phone} label="Chamar no WhatsApp" />}
    </>
  );
}
