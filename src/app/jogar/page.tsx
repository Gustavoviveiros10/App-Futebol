import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_TZ, addToTime, utcToZonedInput, zonedToUtc } from "@/lib/format";
import { LEVELS, MODALITIES } from "@/lib/labels";
import { Logo } from "@/components/Logo";
import { Explore, type ExploreDay, type ExploreMatch } from "./Explore";

export const metadata = { title: "Quero jogar" };

const DAYS = 14;
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Discover() {
  const user = await getCurrentUser();
  const now = new Date();
  const today = utcToZonedInput(now, DEFAULT_TZ).date;
  const day = (offset: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  };
  const end = zonedToUtc(day(DAYS).toISOString().slice(0, 10), "00:00", DEFAULT_TZ);

  // abertas e com aprovação para todo mundo; restritas só para quem é da pelada
  const myGroups = user ? (await db.player.findMany({ where: { userId: user.id, active: true }, select: { groupId: true } })).map((p) => p.groupId) : [];
  const matches = await db.match.findMany({
    where: {
      status: "SCHEDULED",
      shareCode: { not: null },
      date: { gte: now, lt: end },
      OR: [{ access: { in: ["OPEN", "APPROVAL"] } }, ...(myGroups.length ? [{ groupId: { in: myGroups } }] : [])],
    },
    orderBy: { date: "asc" },
    take: 200,
    include: {
      group: { select: { name: true, location: true, modality: true, level: true, timezone: true, owner: { select: { name: true } }, _count: { select: { matches: { where: { status: "FINISHED" } } } } } },
      _count: { select: { players: { where: { status: "CONFIRMED" } } } },
    },
  });

  const list: ExploreMatch[] = matches
    .filter((m) => !m.maxPlayers || m._count.players < m.maxPlayers)
    .map((m) => {
      const { date, time } = utcToZonedInput(m.date, m.group.timezone);
      return {
        code: m.shareCode!,
        day: date,
        time,
        end: addToTime(time, m.durationMin),
        name: m.group.name,
        place: m.location || m.group.location || "Local a combinar",
        access: m.access === "OPEN" ? "aberta" : m.access === "APPROVAL" ? "pedido" : "restrita",
        modality: m.group.modality,
        modalityLabel: MODALITIES[m.group.modality],
        level: m.group.level,
        levelLabel: LEVELS[m.group.level],
        feeCents: m.singleFeeCents,
        confirmed: m._count.players,
        max: m.maxPlayers,
      };
    });

  const days: ExploreDay[] = Array.from({ length: DAYS }, (_, i) => {
    const d = day(i);
    const key = d.toISOString().slice(0, 10);
    const dd = d.getUTCDate(), mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return {
      key,
      short: i === 0 ? "Hoje" : WD[d.getUTCDay()],
      num: dd,
      label: i === 0 ? "hoje" : i === 1 ? "amanhã" : `${WD[d.getUTCDay()].toLowerCase()}, ${String(dd).padStart(2, "0")}/${mm}`,
      tag: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : WD[d.getUTCDay()],
    };
  });

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-12">
      <header className="flex items-center justify-between py-5">
        <Link href="/"><Logo /></Link>
        <Link href={user ? "/app" : "/login"} className="text-sm font-semibold text-fg/55">{user ? "Minhas peladas" : "Entrar"}</Link>
      </header>
      <Explore days={days} matches={list} />
    </div>
  );
}
