import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fmtDayMonth, fmtTimeRange, money, weekdayLong } from "@/lib/format";
import { rememberedPlayer } from "@/lib/guest";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { InstallApp } from "@/components/InstallApp";
import { guestForget, guestRespond } from "./actions";

export const metadata = { title: "Confirmar presença" };

export default async function GuestMatch({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ ok?: string; pedido?: string; fora?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const match = await db.match.findUnique({
    where: { shareCode: code },
    include: {
      group: { include: { players: { where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nickname: true, userId: true } } } },
      players: { where: { status: "CONFIRMED" }, orderBy: { queuedAt: "asc" }, include: { player: { select: { id: true, name: true, nickname: true, photo: true } } } },
    },
  });
  if (!match || match.status === "CANCELED") notFound();
  const { group } = match;
  const tz = group.timezone;
  const [rememberedId, user] = await Promise.all([rememberedPlayer(group.id), getCurrentUser()]);
  const me = group.players.find((p) => p.id === rememberedId);
  const myMp = me ? await db.matchPlayer.findUnique({ where: { matchId_playerId: { matchId: match.id, playerId: me.id } } }) : null;
  const member = user && group.players.some((p) => p.userId === user.id);
  const open = match.status === "SCHEDULED";
  const spots = match.maxPlayers ? Math.max(0, match.maxPlayers - match.players.length) : null;
  const nm = (p: { name: string; nickname: string | null }) => p.nickname || p.name;
  const action = guestRespond.bind(null, code);
  const position = me ? match.players.findIndex((p) => p.playerId === me.id) + 1 : 0;

  return (
    <div className="min-h-dvh">
      <div className="pitch-gradient px-6 pb-20 pt-6 text-center text-white">
        <div className="flex justify-center"><Logo /></div>
        <p className="mt-6 text-sm text-white/70">Convite da {group.name}</p>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-accent">{weekdayLong(match.date, tz)}, {fmtDayMonth(match.date, tz)}</p>
        <h1 className="mt-1 text-5xl">{fmtTimeRange(match.date, match.durationMin, tz)}</h1>
        <p className="mt-2 flex items-center justify-center gap-1 text-sm text-white/70">
          {match.location && <><MapPin size={14} /> {match.location}</>}
          {match.singleFeeCents > 0 && <span>{match.location ? " · " : ""}Avulso {money(match.singleFeeCents)}</span>}
        </p>
        <p className="mt-3 text-sm text-white/80">
          <b>{match.players.length}</b> confirmados{spots != null && <> · <b>{spots}</b> vagas</>}
        </p>
      </div>

      <main className="mx-auto -mt-12 flex max-w-md flex-col gap-4 px-4 pb-10">
        {sp.pedido ? (
          <div className="card p-6 text-center">
            <p className="text-lg font-extrabold">Pedido enviado!</p>
            <p className="mt-1 text-sm text-fg/55">O organizador aprova e te avisa. Sem cadastro.</p>
          </div>
        ) : me && sp.ok ? (
          <div className="card p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-bg"><Check size={26} /></span>
            <p className="mt-3 text-xl font-extrabold">{sp.ok === "vou" ? (myMp?.status === "WAITLIST" ? `${nm(me).split(" ")[0]}, você está na lista de espera` : `Tá confirmado, ${nm(me).split(" ")[0]}!`) : "Resposta registrada"}</p>
            {sp.ok === "vou" && myMp?.status === "CONFIRMED" && (
              <p className="mt-1 text-sm text-fg/55">
                {weekdayLong(match.date, tz)}, das {fmtTimeRange(match.date, match.durationMin, tz)}{match.location ? ` na ${match.location}` : ""}.
                {position > 0 && <> Você é o {position}º{match.maxPlayers ? ` de ${match.maxPlayers}` : ""}.</>}
              </p>
            )}
            {sp.ok === "vou" && myMp?.status === "WAITLIST" && <p className="mt-1 text-sm text-fg/55">Se abrir vaga, você entra automaticamente.</p>}
            <Link href={`/j/${code}`} className="btn-ghost mt-4 w-full">Mudar minha resposta</Link>
          </div>
        ) : !open ? (
          <div className="card p-6 text-center">
            <p className="font-bold">A lista desta partida já foi fechada.</p>
            <p className="mt-1 text-sm text-fg/55">Mudou de ideia? Fale com o organizador.</p>
          </div>
        ) : sp.fora && match.access !== "RESTRICTED" ? (
          <div className="card p-5">
            <p className="text-lg font-extrabold">{match.access === "OPEN" ? "Entrar na partida" : "Pedir vaga"}</p>
            <p className="mt-1 text-sm text-fg/55">
              {match.access === "OPEN" ? "Partida aberta: você entra direto enquanto houver vaga." : "O organizador aprova e te avisa."} Sem cadastro.
            </p>
            <ActionForm action={action} className="mt-3 flex flex-col gap-3">
              <input className="input" name="name" placeholder="Seu nome" aria-label="Seu nome" required />
              <input className="input" name="phone" type="tel" inputMode="tel" placeholder="WhatsApp" aria-label="WhatsApp" required />
              <SubmitButton name="status" value="CONFIRMED" className="btn-primary" pendingText="...">{match.access === "OPEN" ? "Quero jogar" : "Pedir vaga"}</SubmitButton>
            </ActionForm>
            <Link href="/jogar" className="mt-3 block text-center text-xs text-fg/45">← Ver outras partidas</Link>
          </div>
        ) : me ? (
          <div className="card p-5">
            <p className="text-lg font-extrabold">{nm(me)}, você vai jogar?</p>
            {myMp && myMp.status !== "PENDING" && <p className="text-sm text-fg/55">Sua resposta agora: {myMp.status === "CONFIRMED" ? "vou" : myMp.status === "WAITLIST" ? "lista de espera" : myMp.status === "DECLINED" ? "não vou" : "não sei"}.</p>}
            <ActionForm action={action} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="playerId" value={me.id} />
              <SubmitButton name="status" value="CONFIRMED" className="btn-primary" pendingText="...">Vou</SubmitButton>
              <SubmitButton name="status" value="DECLINED" className="btn-ghost" pendingText="...">Não vou</SubmitButton>
            </ActionForm>
            <form action={guestForget.bind(null, code)} className="mt-3 text-center">
              <button className="text-xs text-fg/45 underline">Não é {nm(me).split(" ")[0]}? Trocar</button>
            </form>
          </div>
        ) : (
          <div className="card p-5">
            <p className="text-lg font-extrabold">Quem é você?</p>
            <ActionForm action={action} className="mt-3 flex flex-col gap-3">
              <select className="input" name="playerId" defaultValue="" aria-label="Seu nome na lista" required>
                <option value="" disabled>Escolha seu nome</option>
                {group.players.map((p) => <option key={p.id} value={p.id}>{nm(p)}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <SubmitButton name="status" value="CONFIRMED" className="btn-primary" pendingText="...">Vou</SubmitButton>
                <SubmitButton name="status" value="DECLINED" className="btn-ghost" pendingText="...">Não vou</SubmitButton>
              </div>
            </ActionForm>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-fg/60">Não estou na lista</summary>
              <ActionForm action={action} className="mt-3 flex flex-col gap-3">
                <input className="input" name="name" placeholder="Seu nome" aria-label="Seu nome" required />
                <input className="input" name="phone" type="tel" inputMode="tel" placeholder="WhatsApp (opcional)" aria-label="WhatsApp" />
                <SubmitButton name="status" value="CONFIRMED" className="btn-primary" pendingText="...">{match.access === "APPROVAL" ? "Pedir vaga" : "Vou"}</SubmitButton>
              </ActionForm>
            </details>
            <p className="mt-4 text-center text-xs text-fg/45">Sem cadastro e sem senha. Seu nome fica salvo neste celular para a próxima partida.</p>
          </div>
        )}

        {match.players.length > 0 && (
          <div className="card">
            <p className="section-title px-0">Já confirmados</p>
            <div className="flex flex-wrap gap-2">
              {match.players.map((p) => (
                <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-fg/[0.05] py-1 pl-1 pr-3 text-sm">
                  <Avatar name={p.player.name} photo={p.player.photo} size={22} /> {nm(p.player)}
                </span>
              ))}
            </div>
          </div>
        )}

        {me && sp.ok === "vou" && <InstallApp />}

        {member ? (
          <Link href={`/p/${group.id}/partidas/${match.id}`} className="btn-ghost w-full">Abrir no app</Link>
        ) : (
          sp.ok && (
            <div className="card">
              <p className="font-extrabold">Quer ver seus gols e sua posição no ranking?</p>
              <p className="mt-1 text-sm text-fg/55">Crie uma conta e acompanhe histórico, estatísticas e as próximas partidas. É opcional: para confirmar presença você nunca vai precisar.</p>
              <Link href={`/convite/${group.inviteCode}`} className="btn-primary mt-3 w-full">Criar minha conta</Link>
            </div>
          )
        )}
      </main>
    </div>
  );
}
