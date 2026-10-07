import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDayMonth } from "@/lib/format";
import { Avatar, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveResult } from "../../actions";

export const metadata = { title: "Resultado" };

export default async function ResultForm({ params }: { params: Promise<{ gid: string; mid: string }> }) {
  const { gid, mid } = await params;
  const { group, isOrganizer } = await getMembership(gid);
  if (!isOrganizer) redirect(`/p/${gid}/partidas/${mid}`);
  const match = await db.match.findFirst({
    where: { id: mid, groupId: gid },
    include: { teams: { orderBy: { order: "asc" } }, players: { include: { player: true }, orderBy: { player: { name: "asc" } } } },
  });
  if (!match || match.status === "CANCELED") notFound();
  const finished = match.status === "FINISHED";

  const sections = [
    ...match.teams.map((t) => ({ key: t.id, title: t.name, list: match.players.filter((p) => p.teamId === t.id), open: true })),
    { key: "noteam", title: match.teams.length ? "Confirmados sem time" : "Confirmados", list: match.players.filter((p) => !p.teamId && p.status === "CONFIRMED"), open: true },
    { key: "others", title: "Outros jogadores (apareceram sem confirmar?)", list: match.players.filter((p) => !p.teamId && p.status !== "CONFIRMED" && (p.player.active || p.played)), open: false },
  ].filter((s) => s.list.length);

  const small = "input px-2 py-2 text-center text-[15px]";
  return (
    <>
      <PageHeader title="Resultado" subtitle={fmtDayMonth(match.date, group.timezone)} back={`/p/${gid}/partidas/${mid}?aba=resultado`} />
      <ActionForm action={saveResult.bind(null, gid, mid)}>
        {match.teams.length >= 2 && (
          <div className="card">
            <p className="section-title px-0">Placar</p>
            <div className="flex items-end justify-center gap-3">
              {match.teams.map((t, i) => (
                <div key={t.id} className="flex items-end gap-3">
                  {i > 0 && <span className="pb-3 text-xl font-bold text-black/30">×</span>}
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-xs font-bold uppercase text-black/50">{t.name.replace("Time ", "")}</span>
                    <input name={`score_${t.id}`} type="number" inputMode="numeric" min={0} defaultValue={t.score ?? ""} className="input w-20 text-center text-3xl font-black" required />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        {match.teams.length < 2 && (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Sem times sorteados, o placar e as vitórias não são contabilizados. Você ainda pode lançar gols e notas.</p>
        )}

        {sections.map((s) => (
          <details key={s.key} open={s.open} className="group">
            <summary className="section-title cursor-pointer list-none">{s.title} ({s.list.length}) <span className="group-open:hidden">▸</span></summary>
            <div className="flex flex-col gap-2">
              {s.list.map((mp) => {
                const played = finished ? mp.played : mp.status === "CONFIRMED";
                return (
                  <div key={mp.id} className="card p-3">
                    <label className="flex items-center gap-3">
                      <Avatar name={mp.player.name} photo={mp.player.photo} size={32} />
                      <span className="flex-1 truncate font-semibold">{mp.player.nickname || mp.player.name}</span>
                      <span className="text-xs text-black/50">Jogou</span>
                      <input type="checkbox" name={`played_${mp.id}`} defaultChecked={played} className="h-5 w-5 accent-pitch-600" />
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="text-center text-[11px] font-semibold text-black/50">⚽ Gols<input className={small} name={`goals_${mp.id}`} type="number" inputMode="numeric" min={0} defaultValue={mp.goals || ""} placeholder="0" /></label>
                      <label className="text-center text-[11px] font-semibold text-black/50">🎯 Assist.<input className={small} name={`assists_${mp.id}`} type="number" inputMode="numeric" min={0} defaultValue={mp.assists || ""} placeholder="0" /></label>
                      <label className="text-center text-[11px] font-semibold text-black/50">⭐ Nota<input className={small} name={`rating_${mp.id}`} inputMode="decimal" defaultValue={mp.rating?.toString().replace(".", ",") ?? ""} placeholder="1–10" /></label>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-black/40">Cartões e defesas</summary>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <label className="text-center text-[11px] font-semibold text-black/50">🟨<input className={small} name={`yellow_${mp.id}`} type="number" min={0} max={2} defaultValue={mp.yellowCards || ""} placeholder="0" /></label>
                        <label className="text-center text-[11px] font-semibold text-black/50">🟥<input className={small} name={`red_${mp.id}`} type="number" min={0} max={1} defaultValue={mp.redCards || ""} placeholder="0" /></label>
                        <label className="text-center text-[11px] font-semibold text-black/50">🧤 Defesas<input className={small} name={`saves_${mp.id}`} type="number" min={0} defaultValue={mp.saves || ""} placeholder="0" /></label>
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
        <p className="px-1 text-xs text-black/45">A nota (1 a 10) serve só como referência para equilibrar os próximos sorteios.</p>
        <div className="sticky bottom-24 z-10">
          <SubmitButton className="btn-primary w-full py-4 shadow-lg" pendingText="Salvando...">{finished ? "Salvar alterações" : "Encerrar partida e salvar"}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
