import Link from "next/link";
import { ArrowRight, Check, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDayMonth, fmtTime, money, monthKey, monthLabel, weekdayLong } from "@/lib/format";
import { financeSummary, paymentView } from "@/lib/finance";
import { groupStats } from "@/lib/stats";
import { inviteText } from "@/lib/invite";
import { inviteToMatchText } from "@/lib/share";
import { Avatar } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { respond } from "./partidas/actions";

export default async function Dashboard({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  const { group, isOrganizer, player: me, user } = await getMembership(gid);
  const tz = group.timezone;

  const [next, last, playerCount, matchCount, seasonStats] = await Promise.all([
    db.match.findFirst({
      where: { groupId: gid, status: { in: ["SCHEDULED", "CLOSED", "DRAWN"] } },
      orderBy: { date: "asc" },
      include: { players: { where: { player: { active: true } }, select: { status: true, playerId: true } } },
    }),
    db.match.findFirst({
      where: { groupId: gid, status: "FINISHED" },
      orderBy: { date: "desc" },
      include: { teams: { orderBy: { order: "asc" } }, mvp: true },
    }),
    db.player.count({ where: { groupId: gid, active: true } }),
    db.match.count({ where: { groupId: gid } }),
    groupStats(gid, "temporada"),
  ]);

  const count = (s: string[]) => next?.players.filter((p) => s.includes(p.status)).length ?? 0;
  const mine = next?.players.find((p) => p.playerId === me.id);
  const topScorer = [...seasonStats].sort((a, b) => b.goals - a.goals)[0];
  const myStats = seasonStats.find((s) => s.player.id === me.id);

  const steps = [
    { done: playerCount > 1, label: "Cadastrar os jogadores", href: `/p/${gid}/jogadores/novo` },
    { done: matchCount > 0, label: "Criar a próxima partida", href: `/p/${gid}/partidas/nova` },
  ];
  const onboarding = isOrganizer && steps.some((s) => !s.done);

  return (
    <div className="flex flex-col gap-4 pt-1">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight">E aí, {(me.nickname || user.name).split(" ")[0]}! 👋</h1>

      {onboarding && (
        <div className="card">
          <p className="font-extrabold">Vamos colocar a pelada pra rodar</p>
          <div className="mt-3 flex flex-col gap-2">
            {steps.map((s, i) => (
              <Link key={s.label} href={s.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${s.done ? "bg-pitch-50 text-pitch-800" : "bg-black/[0.04]"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${s.done ? "bg-pitch-600 text-white" : "bg-white ring-1 ring-black/10"}`}>
                  {s.done ? <Check size={16} /> : i + 1}
                </span>
                <span className={`flex-1 font-semibold ${s.done ? "line-through opacity-60" : ""}`}>{s.label}</span>
                {!s.done && <ArrowRight size={18} className="text-black/30" />}
              </Link>
            ))}
            <WhatsAppButton className="btn-whatsapp btn-sm mt-1" label="3. Mandar o convite no grupo" text={inviteText(group.name, group.inviteCode)} />
          </div>
        </div>
      )}

      {/* Próxima pelada */}
      {next ? (
        <div className="pitch-gradient overflow-hidden rounded-3xl text-white">
          <Link href={`/p/${gid}/partidas/${next.id}`} className="block p-5 pb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-lime-accent">Próxima pelada</p>
            <p className="mt-1 text-3xl font-black tracking-tight">{weekdayLong(next.date, tz)} — {fmtTime(next.date, tz)}</p>
            <p className="text-sm text-white/65">
              {fmtDayMonth(next.date, tz)}
              {next.location && <><MapPin size={13} className="mb-0.5 ml-2 mr-0.5 inline" />{next.location}</>}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/10 py-2">
                <p className="text-2xl font-black">{count(["CONFIRMED"])}{next.maxPlayers ? <span className="text-sm text-white/50">/{next.maxPlayers}</span> : null}</p>
                <p className="text-[11px] font-semibold text-white/60">confirmados</p>
              </div>
              <div className="rounded-2xl bg-white/10 py-2">
                <p className="text-2xl font-black">{count(["PENDING", "MAYBE"])}</p>
                <p className="text-[11px] font-semibold text-white/60">pendentes</p>
              </div>
              <div className="rounded-2xl bg-white/10 py-2">
                <p className="text-2xl font-black">{count(["DECLINED"])}</p>
                <p className="text-[11px] font-semibold text-white/60">ausentes</p>
              </div>
            </div>
            {count(["WAITLIST"]) > 0 && <p className="mt-2 text-center text-xs text-white/60">+ {count(["WAITLIST"])} na lista de espera</p>}
          </Link>
          {next.status === "SCHEDULED" ? (
            <div className="grid grid-cols-3 gap-2 bg-black/20 p-3">
              {([
                ["CONFIRMED", "✅ Vou"],
                ["DECLINED", "❌ Não vou"],
                ["MAYBE", "⏳ Não sei"],
              ] as const).map(([s, l]) => {
                const active = mine?.status === s || (s === "CONFIRMED" && mine?.status === "WAITLIST");
                return (
                  <form key={s} action={respond.bind(null, gid, next.id, s)}>
                    <SubmitButton pendingText="..." className={`btn w-full px-2 py-2.5 text-sm ${active ? "bg-lime-accent text-pitch-950" : "bg-white/10 text-white hover:bg-white/20"}`}>{l}</SubmitButton>
                  </form>
                );
              })}
            </div>
          ) : (
            <Link href={`/p/${gid}/partidas/${next.id}?aba=times`} className="flex items-center justify-between bg-black/20 px-5 py-3 text-sm font-semibold">
              {next.status === "DRAWN" ? "🔥 Times sorteados — ver times" : "🔒 Lista fechada — ver lista"}
              <ArrowRight size={16} />
            </Link>
          )}
          {isOrganizer && next.status === "SCHEDULED" && (
            <div className="px-3 pb-3">
              <WhatsAppButton className="btn-whatsapp btn-sm w-full" label="Chamar a galera no WhatsApp" text={inviteToMatchText(next, tz, count(["CONFIRMED"]), next.maxPlayers)} />
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-4xl">📅</p>
          <p className="mt-2 font-bold">Nenhuma pelada marcada</p>
          {isOrganizer ? (
            <Link href={`/p/${gid}/partidas/nova`} className="btn-primary mt-3 w-full">Criar próxima partida</Link>
          ) : (
            <p className="text-sm text-black/50">Assim que o organizador marcar, aparece aqui.</p>
          )}
        </div>
      )}

      {isOrganizer ? <OrganizerFinance /> : <MyFinanceCard />}

      {last && (
        <Link href={`/p/${gid}/partidas/${last.id}?aba=resultado`} className="card block">
          <p className="section-title px-0">Último resultado · {fmtDayMonth(last.date, tz)}</p>
          {last.teams.length >= 2 ? (
            <p className="text-xl font-extrabold">{last.teams.map((t) => `${t.name.replace("Time ", "")} ${t.score ?? "-"}`).join("  ×  ")}</p>
          ) : (
            <p className="font-semibold text-black/60">Partida encerrada</p>
          )}
          {last.mvp ? (
            <p className="mt-2 flex items-center gap-2 text-sm"><Avatar name={last.mvp.name} photo={last.mvp.photo} size={24} /> 🏆 Craque: <b>{last.mvp.nickname || last.mvp.name}</b></p>
          ) : last.votingOpen ? (
            <p className="mt-2 text-sm font-semibold text-amber-700">🗳️ Votação do craque aberta — vote!</p>
          ) : null}
        </Link>
      )}

      {(topScorer?.goals || myStats) && (
        <div className="grid grid-cols-2 gap-3">
          {topScorer && topScorer.goals > 0 && (
            <Link href={`/p/${gid}/rankings?r=artilharia`} className="card block">
              <p className="text-xs font-bold uppercase text-black/45">⚽ Artilheiro</p>
              <p className="mt-1 truncate font-extrabold">{topScorer.player.nickname || topScorer.player.name}</p>
              <p className="text-sm text-black/50">{topScorer.goals} gols na temporada</p>
            </Link>
          )}
          {myStats && (
            <Link href={`/p/${gid}/jogadores/${me.id}`} className="card block">
              <p className="text-xs font-bold uppercase text-black/45">📊 Você na temporada</p>
              <p className="mt-1 font-extrabold">{myStats.games} jogos · {myStats.goals} gols</p>
              <p className="text-sm text-black/50">{myStats.wins} vitórias</p>
            </Link>
          )}
        </div>
      )}
    </div>
  );

  async function OrganizerFinance() {
    const key = monthKey(new Date(), tz);
    const s = await financeSummary(gid, key, tz);
    return (
      <Link href={`/p/${gid}/financeiro`} className="card block">
        <div className="flex items-center justify-between">
          <p className="section-title px-0">Financeiro · {monthLabel(key)}</p>
          <ArrowRight size={16} className="text-black/30" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-black text-pitch-700">{money(s.received)}</p>
            <p className="text-xs font-medium text-black/50">recebidos</p>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600">{money(s.pending + s.overdue)}</p>
            <p className="text-xs font-medium text-black/50">a receber</p>
          </div>
        </div>
        {s.monthlyCount > 0 && (
          <div className="mt-3 flex gap-2 text-xs font-semibold">
            <span className="chip bg-pitch-100 text-pitch-800">✓ {s.monthlyOk} mensalistas em dia</span>
            {s.monthlyLate > 0 && <span className="chip bg-red-100 text-red-700">{s.monthlyLate} atrasados</span>}
          </div>
        )}
        {!s.monthlyGenerated && s.monthlyCount > 0 && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">⚠️ Mensalidades deste mês ainda não geradas</p>}
      </Link>
    );
  }

  async function MyFinanceCard() {
    const open = await db.payment.findMany({ where: { playerId: me.id, status: "PENDING" } });
    const due = open.reduce((s, p) => s + p.amountCents, 0);
    const late = open.some((p) => paymentView(p) === "OVERDUE");
    return (
      <Link href={`/p/${gid}/financeiro`} className="card flex items-center justify-between">
        <div>
          <p className="section-title px-0">Meu financeiro</p>
          <p className={`text-xl font-black ${due ? (late ? "text-red-600" : "text-amber-600") : "text-pitch-700"}`}>{due ? `${money(due)} ${late ? "atrasado" : "pendente"}` : "Em dia ✅"}</p>
        </div>
        <ArrowRight size={18} className="text-black/30" />
      </Link>
    );
  }
}
