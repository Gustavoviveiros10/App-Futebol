import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDayMonth } from "@/lib/format";
import { TAGS_BAD, TAGS_GOOD } from "@/lib/ratings";
import { Avatar, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { StarInput } from "@/components/StarInput";
import { ratePlayers } from "../../actions";

export const metadata = { title: "Avaliar jogadores" };

export default async function RatePage({ params }: { params: Promise<{ gid: string; mid: string }> }) {
  const { gid, mid } = await params;
  const { group, player } = await getMembership(gid);
  const match = await db.match.findFirst({
    where: { id: mid, groupId: gid },
    include: { players: { where: { played: true }, include: { player: true }, orderBy: { player: { name: "asc" } } } },
  });
  if (!match) notFound();
  const back = `/p/${gid}/partidas/${mid}?aba=resultado`;
  if (match.status !== "FINISHED" || !match.players.some((p) => p.playerId === player.id)) redirect(back);
  const others = match.players.filter((p) => p.playerId !== player.id);
  const mine = await db.peerRating.findMany({ where: { matchId: mid, raterId: player.id } });
  const given = new Map(mine.map((r) => [r.ratedId, r]));

  return (
    <>
      <PageHeader title="Avaliar jogadores" subtitle={`Partida de ${fmtDayMonth(match.date, group.timezone)}`} back={back} />
      <p className="mb-4 text-sm text-fg/60">
        Qualidade é como a pessoa joga. Conduta é como ela se comporta. Dê de 1 a 5 estrelas em cada uma. Ninguém vê quem avaliou.
      </p>
      <ActionForm action={ratePlayers.bind(null, gid, mid)}>
        {others.map((mp) => {
          const r = given.get(mp.playerId);
          return (
            <div key={mp.id} className="card flex flex-col gap-2 p-4">
              <div className="mb-1 flex items-center gap-3">
                <Avatar name={mp.player.name} photo={mp.player.photo} size={36} />
                <b className="truncate">{mp.player.nickname || mp.player.name}</b>
              </div>
              <StarInput name={`q_${mp.playerId}`} label="Qualidade" defaultValue={r?.quality} />
              <StarInput name={`c_${mp.playerId}`} label="Conduta" defaultValue={r?.conduct} />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[...TAGS_GOOD, ...TAGS_BAD].map((t) => {
                  const bad = (TAGS_BAD as readonly string[]).includes(t);
                  return (
                    <label key={t} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ring-1 ${bad ? "ring-red-400/30 has-[:checked]:bg-red-500/20 has-[:checked]:text-red-300" : "ring-fg/10 has-[:checked]:bg-accent has-[:checked]:text-bg"}`}>
                      <input type="checkbox" name={`t_${mp.playerId}`} value={t} defaultChecked={r?.tags.includes(t)} className="sr-only" />
                      {t}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
        {others.length === 0 && <p className="card text-sm text-fg/55">Ninguém mais jogou nesta partida.</p>}
        <div className="sticky bottom-24 z-10">
          <SubmitButton className="btn-primary w-full py-4 shadow-lg" pendingText="Enviando...">Enviar avaliações</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
