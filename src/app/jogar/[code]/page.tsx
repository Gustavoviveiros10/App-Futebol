import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MapPin, Send, Check } from "lucide-react";
import { db } from "@/lib/db";
import { fmtDayMonth, fmtTimeRange, initials, money, weekdayLong } from "@/lib/format";
import { LEVELS, MODALITIES } from "@/lib/labels";
import { rememberedPlayer } from "@/lib/guest";
import { ActionForm, SubmitButton } from "@/components/forms";
import { guestRespond } from "@/app/j/[code]/actions";

export const metadata = { title: "Partida pública" };

export default async function PublicMatch({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ feito?: string; nome?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const match = await db.match.findUnique({
    where: { shareCode: code },
    include: {
      group: { select: { id: true, name: true, location: true, modality: true, level: true, timezone: true, inviteCode: true, owner: { select: { name: true } }, _count: { select: { matches: { where: { status: "FINISHED" } } } } } },
      _count: { select: { players: { where: { status: "CONFIRMED" } } } },
    },
  });
  if (!match || match.status === "CANCELED") notFound();
  // partida restrita não é pública: vai para o link normal de presença
  if (match.access === "RESTRICTED") redirect(`/j/${code}`);

  const { group } = match;
  const tz = group.timezone;
  const open = match.access === "OPEN";
  const org = group.owner.name.split(" ")[0];
  const when = `${weekdayLong(match.date, tz)}, ${fmtDayMonth(match.date, tz)}`;
  const place = match.location || group.location;

  if (sp.feito) {
    const meId = await rememberedPlayer(group.id);
    const me = meId ? await db.player.findUnique({ where: { id: meId }, select: { name: true, nickname: true } }) : null;
    const first = sp.feito === "entrou" ? (me?.nickname || me?.name || "").split(" ")[0] : (sp.nome ?? "").slice(0, 30);
    const done = sp.feito === "entrou";
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-3 px-4 pb-12 pt-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-bg shadow-[0_0_0_10px_color-mix(in_oklab,var(--color-accent)_15%,transparent)]">
          {done ? <Check size={34} strokeWidth={3} /> : <Send size={30} strokeWidth={2.5} />}
        </span>
        <h1 className="mt-4 text-4xl">{done ? `Tá dentro${first ? `, ${first}` : ""}!` : `Pedido enviado${first ? `, ${first}` : ""}!`}</h1>
        <p className="max-w-[30ch] text-fg/60">
          {done
            ? `${group.name}, ${when} às ${fmtTimeRange(match.date, match.durationMin, tz)}${place ? ` na ${place}` : ""}.`
            : `${org} vai analisar e você recebe a resposta no WhatsApp.`}
        </p>
        <Link href="/jogar" className="btn-ghost mt-2 w-full">Ver outras partidas</Link>
        <div className="card mt-3 flex w-full flex-col gap-2 text-left">
          <p className="font-extrabold">Jogue mais vezes com menos esforço</p>
          <p className="text-sm text-fg/55">Com uma conta você salva suas partidas favoritas, recebe aviso quando abrir vaga perto e monta seu histórico. Opcional.</p>
          <Link href={`/convite/${group.inviteCode}`} className="btn-primary">Criar minha conta</Link>
        </div>
      </div>
    );
  }

  const spots = match.maxPlayers ? Math.max(0, match.maxPlayers - match._count.players) : null;
  const fill = match.maxPlayers ? Math.round((match._count.players / match.maxPlayers) * 100) : 0;
  const closed = match.status !== "SCHEDULED";
  const action = guestRespond.bind(null, code);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-12 pt-4">
      <div className="flex items-center gap-2.5">
        <Link href="/jogar" aria-label="Voltar" className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-fg/[0.06] text-lg">←</Link>
        <span className="text-[13px] font-semibold text-fg/70">Partida pública</span>
      </div>

      <div className="pitch-gradient relative flex flex-col gap-1.5 rounded-[18px] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{when}</p>
        <p className="font-display text-5xl font-bold leading-none">{fmtTimeRange(match.date, match.durationMin, tz)}</p>
        <p className="mt-1 text-[17px] font-bold">{group.name}</p>
        {place && <p className="text-sm text-white/70">{place}</p>}
        {match.maxPlayers && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-accent" style={{ width: `${fill}%` }} /></div>}
        <p className="flex justify-between text-sm text-white/80">
          <span>{match._count.players} confirmados</span>
          <span>{spots != null ? <><b>{spots}</b> {spots === 1 ? "vaga" : "vagas"}</> : "Vagas livres"}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          ["Modalidade", MODALITIES[group.modality]],
          ["Nível", LEVELS[group.level]],
          ["Valor avulso", match.singleFeeCents > 0 ? money(match.singleFeeCents) : "Grátis"],
          ["Duração", `${match.durationMin} min`],
        ].map(([l, v]) => (
          <div key={l} className="flex flex-col gap-0.5 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-fg/[0.07]">
            <small className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-fg/45">{l}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-fg/[0.07]">
        <i className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-extrabold not-italic">{initials(group.owner.name)}</i>
        <span className="flex flex-col">
          <b>Organizado por {org}</b>
          <small className="text-fg/55">{group._count.matches} {group._count.matches === 1 ? "partida realizada" : "partidas realizadas"} no app</small>
        </span>
      </div>

      {place && <p className="flex items-center gap-1.5 text-sm text-fg/70"><MapPin size={14} /> {place}</p>}

      {closed || spots === 0 ? (
        <div className="card text-center">
          <p className="font-bold">{closed ? "A lista desta partida já foi fechada." : "As vagas acabaram."}</p>
          <Link href="/jogar" className="btn-ghost mt-3 w-full">Ver outras partidas</Link>
        </div>
      ) : (
        <ActionForm action={action} className="flex flex-col gap-3">
          <input type="hidden" name="origem" value="jogar" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg/40">{open ? "Entrar na partida" : "Pedir vaga"}</p>
          <input className="input" name="name" placeholder="Seu nome" aria-label="Seu nome" required />
          <input className="input" name="phone" type="tel" inputMode="tel" placeholder="Seu WhatsApp" aria-label="Seu WhatsApp" required />
          <SubmitButton name="status" value="CONFIRMED" className="btn-primary py-4 text-base" pendingText="Enviando...">{open ? "Entrar na partida" : "Pedir vaga"}</SubmitButton>
          <p className="text-center text-xs text-fg/45">
            {open ? "Partida aberta: você entra direto e recebe a confirmação no WhatsApp. Sem cadastro." : "O organizador aprova e você recebe a confirmação no WhatsApp. Sem cadastro."}
          </p>
        </ActionForm>
      )}
    </div>
  );
}
