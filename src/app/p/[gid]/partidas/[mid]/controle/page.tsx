import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDayMonth, fmtTimeRange } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { MatchControl } from "@/components/MatchControl";
import { TEAM_DOT } from "@/lib/teams";
import { saveLive } from "../../actions";

export const metadata = { title: "Controle da partida" };

export default async function ControlPage({ params }: { params: Promise<{ gid: string; mid: string }> }) {
  const { gid, mid } = await params;
  const { group, isOrganizer } = await getMembership(gid);
  const back = `/p/${gid}/partidas/${mid}`;
  if (!isOrganizer) redirect(back);
  const match = await db.match.findFirst({ where: { id: mid, groupId: gid }, include: { teams: { orderBy: { order: "asc" } } } });
  if (!match || match.status === "CANCELED") notFound();
  const rotation = match.format === "ROTATION";
  return (
    <>
      <PageHeader title="Controle da partida" subtitle={`${fmtDayMonth(match.date, group.timezone)} · ${fmtTimeRange(match.date, match.durationMin, group.timezone)}${rotation ? " · Rodízio" : ""}`} back={back} />
      <MatchControl
        matchId={mid}
        rotation={rotation}
        teams={match.teams.map((t) => ({ id: t.id, name: t.name, dot: TEAM_DOT[t.color] ?? "bg-fg/30" }))}
        initial={{
          score: Object.fromEntries(match.teams.map((t) => [t.id, t.score ?? 0])),
          table: Object.fromEntries(match.teams.map((t) => [t.id, { w: t.wins, d: t.draws, l: t.losses }])),
        }}
        save={saveLive.bind(null, gid, mid)}
      />
    </>
  );
}
