import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { POSITIONS, fmtDate, fmtStars, money } from "@/lib/format";
import { peerProfile } from "@/lib/ratings";
import { Stars } from "@/components/Stars";
import { groupStats } from "@/lib/stats";
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

  const [[all], [season], recent, payments, peer] = await Promise.all([
    groupStats(gid, "sempre", pid),
    groupStats(gid, "temporada", pid),
    db.matchPlayer.findMany({
      where: { playerId: pid, played: true, match: { status: "FINISHED" } },
      orderBy: { match: { date: "desc" } },
      take: 8,
      include: { match: { include: { teams: true } }, team: true },
    }),
    canSeeMoney ? db.payment.findMany({ where: { playerId: pid, status: { not: "CANCELED" } }, orderBy: { dueDate: "desc" }, take: 6 }) : Promise.resolve([]),
    peerProfile(pid),
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
      <div className="pitch-gradient -mt-2 mb-4 flex flex-col items-center rounded-2xl px-4 pb-6 pt-6 text-center text-white">
        <Avatar name={p.name} photo={p.photo} size={88} className="ring-4 ring-white/20" />
        <h1 className="mt-3 text-4xl">{p.nickname || p.name}</h1>
        {p.nickname && <p className="text-sm text-white/60">{p.name}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <span className="chip bg-white/15">{pos.label}</span>
          <span className="chip bg-white/15">{p.billingType === "MONTHLY" ? "Mensalista" : "Avulso"}</span>
          {p.role === "ORGANIZER" && <span className="chip bg-accent text-bg">Organizador</span>}
          {!p.active && <span className="chip bg-red-500/80">Inativo</span>}
        </div>
        <p className="mt-2 text-xs text-white/50">Na pelada desde {fmtDate(p.joinedAt, group.timezone)}</p>
      </div>

      <p className="section-title">Todos os tempos</p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Partidas" value={s?.games ?? 0} />
        <Stat label="Gols" value={s?.goals ?? 0} />
        <Stat label="Assistências" value={s?.assists ?? 0} />
        <Stat label="Nota média" value={<span className="flex items-baseline gap-1">{fmtStars(s?.avgRating != null ? s.avgRating / 2 : null)}<small className="text-sm text-gold">★</small></span>} />
        <Stat label="Craque" value={`${s?.mvps ?? 0}x`} />
        {p.position === "GOALKEEPER" && <Stat label="Defesas" value={s?.saves ?? 0} />}
      </div>

      <p className="section-title">Avaliações dos colegas</p>
      <div className="card mb-4">
        {peer.count === 0 ? (
          <p className="text-sm text-fg/50">Ainda sem avaliações. Elas aparecem depois que os colegas avaliam a partida.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {([["Qualidade", peer.quality], ["Conduta", peer.conduct]] as const).map(([label, v]) => (
                <div key={label} className="rounded-xl bg-fg/[0.04] p-3 ring-1 ring-fg/[0.05]">
                  <p className="text-xs font-medium text-fg/50">{label}</p>
                  <p className="text-2xl font-extrabold">{fmtStars(v)}</p>
                  <Stars value={v} size={14} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg/45">{peer.count} avaliação(ões), todas anônimas.</p>
            {peer.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {peer.tags.map((t) => (
                  <span key={t.tag} className={`chip ${t.bad ? "bg-red-500/15 text-red-400" : "bg-fg/[0.06] text-fg/75"}`}>
                    {t.tag} <b>{t.count}</b>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {season && (
        <>
          <p className="section-title">Temporada atual</p>
          <div className="card mb-4 flex justify-around text-center">
            <div><p className="text-xl font-extrabold">{season.games}</p><p className="text-xs text-fg/50">jogos</p></div>
            <div><p className="text-xl font-extrabold">{season.goals}</p><p className="text-xs text-fg/50">gols</p></div>
            <div><p className="text-xl font-extrabold">{season.assists}</p><p className="text-xs text-fg/50">assist.</p></div>
            <div><p className="text-xl font-extrabold">{fmtStars(season.avgRating != null ? season.avgRating / 2 : null)} <small className="text-sm text-gold">★</small></p><p className="text-xs text-fg/50">nota média</p></div>
          </div>
        </>
      )}

      {isOrganizer && (
        <div className="card mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">Nível para o sorteio</p>
            <p className="text-xs text-fg/45">Só organizadores veem</p>
          </div>
          <Stars value={p.skill / 2} size={20} />
        </div>
      )}

      {recent.length > 0 && (
        <>
          <p className="section-title">Últimas partidas</p>
          <div className="card mb-4 divide-y divide-fg/[0.07] p-0">
            {recent.map((mp) => {
              return (
                <Link key={mp.id} href={`/p/${gid}/partidas/${mp.matchId}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{fmtDate(mp.match.date, group.timezone)}</p>
                    <p className="text-fg/50">{mp.team?.name ?? "Sem time"}</p>
                  </div>
                  <div className="text-right text-sm">
                    {mp.goals > 0 && <span className="mr-2">{mp.goals} G</span>}
                    {mp.assists > 0 && <span className="mr-2">{mp.assists} A</span>}
                    {mp.match.mvpPlayerId === p.id && <Trophy size={13} className="mr-2 inline text-gold" />}
                    {mp.rating != null && <Stars value={mp.rating / 2} size={12} />}
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
          <div className="card mb-4 divide-y divide-fg/[0.07] p-0">
            {payments.length === 0 && <p className="px-4 py-4 text-sm text-fg/50">Nenhuma cobrança.</p>}
            {payments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{pay.description ?? (pay.type === "MONTHLY" ? "Mensalidade" : "Avulso")}{pay.reference ? ` ${pay.reference.split("-").reverse().join("/")}` : ""}</p>
                  <p className="text-fg/50">Vence {fmtDate(pay.dueDate, group.timezone)}</p>
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
