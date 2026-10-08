import Link from "next/link";
import { MapPin, Search, Users } from "lucide-react";
import type { Level, Modality, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_TZ, fmtDayMonth, fmtTimeRange, money, utcToZonedInput, weekdayLong, zonedToUtc } from "@/lib/format";
import { LEVELS, MODALITIES } from "@/lib/labels";
import { Logo } from "@/components/Logo";
import { Empty } from "@/components/ui";

export const metadata = { title: "Quero jogar" };

const DAYS = [
  ["hoje", "Hoje"],
  ["amanha", "Amanhã"],
  ["semana", "Próximos 7 dias"],
] as const;
type Day = (typeof DAYS)[number][0];

export default async function Discover({ searchParams }: { searchParams: Promise<{ dia?: Day; mod?: Modality; nivel?: Level; q?: string }> }) {
  const sp = await searchParams;
  const dia: Day = DAYS.some(([k]) => k === sp.dia) ? sp.dia! : "semana";
  const mod = sp.mod && sp.mod in MODALITIES ? sp.mod : undefined;
  const nivel = sp.nivel && sp.nivel in LEVELS ? sp.nivel : undefined;
  const q = sp.q?.trim().slice(0, 60) || undefined;

  // janelas no fuso de São Paulo (fuso padrão das peladas)
  const now = new Date();
  const today = utcToZonedInput(now, DEFAULT_TZ).date;
  const dayStart = (offset: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return zonedToUtc(d.toISOString().slice(0, 10), "00:00", DEFAULT_TZ);
  };
  const range = dia === "hoje" ? { gte: now, lt: dayStart(1) } : dia === "amanha" ? { gte: dayStart(1), lt: dayStart(2) } : { gte: now, lt: dayStart(8) };

  const where: Prisma.MatchWhereInput = {
    access: { in: ["OPEN", "APPROVAL"] },
    status: "SCHEDULED",
    shareCode: { not: null },
    date: range,
    group: { ...(mod ? { modality: mod } : {}), ...(nivel ? { level: nivel } : {}) },
    ...(q ? { OR: [{ location: { contains: q, mode: "insensitive" } }, { group: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const matches = await db.match.findMany({
    where,
    orderBy: { date: "asc" },
    take: 40,
    include: { group: { select: { name: true, modality: true, level: true, timezone: true } }, _count: { select: { players: { where: { status: "CONFIRMED" } } } } },
  });
  const withSpots = matches.filter((m) => !m.maxPlayers || m._count.players < m.maxPlayers);

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ dia, mod, nivel, q, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/jogar?${p}`;
  };
  const chip = (on: boolean) => `chip shrink-0 px-3.5 py-2 text-sm ${on ? "bg-fg text-bg" : "bg-surface text-fg/60 ring-1 ring-fg/[0.07]"}`;

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-12">
      <header className="flex items-center justify-between py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/login" className="text-sm font-semibold text-fg/55">Entrar</Link>
      </header>
      <h1 className="text-5xl">Quero jogar</h1>
      <p className="mt-2 text-fg/55">Partidas com vaga abertas para quem quiser jogar. Sem cadastro: é só pedir a vaga.</p>

      <form action="/jogar" className="mt-5 flex gap-2">
        {dia !== "semana" && <input type="hidden" name="dia" value={dia} />}
        {mod && <input type="hidden" name="mod" value={mod} />}
        {nivel && <input type="hidden" name="nivel" value={nivel} />}
        <input className="input flex-1" name="q" defaultValue={q} placeholder="Bairro, quadra ou nome da pelada" aria-label="Buscar" />
        <button className="btn-ghost shrink-0 px-4" aria-label="Buscar"><Search size={18} /></button>
      </form>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {DAYS.map(([k, l]) => <Link key={k} href={href({ dia: k })} className={chip(dia === k)}>{l}</Link>)}
      </div>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={href({ mod: undefined })} className={chip(!mod)}>Todas</Link>
        {Object.entries(MODALITIES).map(([k, l]) => <Link key={k} href={href({ mod: k })} className={chip(mod === k)}>{l}</Link>)}
        {Object.entries(LEVELS).map(([k, l]) => <Link key={k} href={href({ nivel: nivel === k ? undefined : k })} className={chip(nivel === k)}>{l}</Link>)}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {withSpots.length === 0 ? (
          <Empty icon={<Users size={26} />} title="Nenhuma partida com vaga" text="Tente outro dia ou tire algum filtro. Organizadores podem abrir a partida ao público nas configurações dela." />
        ) : (
          withSpots.map((m) => {
            const tz = m.group.timezone;
            const spots = m.maxPlayers ? m.maxPlayers - m._count.players : null;
            return (
              <Link key={m.id} href={`/j/${m.shareCode}?fora=1`} className="card flex flex-col gap-1.5 transition hover:ring-accent/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">{weekdayLong(m.date, tz).slice(0, 3)}, {fmtDayMonth(m.date, tz)} · {fmtTimeRange(m.date, m.durationMin, tz)}</p>
                  <span className={`chip ${m.access === "OPEN" ? "bg-accent/15 text-accent" : "bg-gold/15 text-gold"}`}>{m.access === "OPEN" ? "Aberta" : "Com aprovação"}</span>
                </div>
                <p className="text-lg font-extrabold">{m.group.name}</p>
                {m.location && <p className="flex items-center gap-1 text-sm text-fg/55"><MapPin size={13} /> {m.location}</p>}
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <span className="chip bg-fg/[0.06] text-fg/70">{MODALITIES[m.group.modality]}</span>
                  <span className="chip bg-fg/[0.06] text-fg/70">{LEVELS[m.group.level]}</span>
                  <span className="chip bg-fg/[0.06] text-fg/70">{spots != null ? `${spots} vaga${spots === 1 ? "" : "s"}` : "Vagas livres"}</span>
                  {m.singleFeeCents > 0 && <span className="chip bg-fg/[0.06] text-fg/70">{money(m.singleFeeCents)}</span>}
                </div>
              </Link>
            );
          })
        )}
      </div>
      <p className="mt-6 text-center text-xs text-fg/40">Organiza uma pelada? Deixe a partida aberta ou com aprovação e complete o time com gente da região.</p>
    </div>
  );
}
