import Link from "next/link";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { PERIODS, RANKINGS, groupStats, type Period, type RankingKey } from "@/lib/stats";
import { Avatar, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Rankings" };

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function Rankings({ params, searchParams }: { params: Promise<{ gid: string }>; searchParams: Promise<{ r?: string; p?: string }> }) {
  const { gid } = await params;
  const sp = await searchParams;
  const { player: me } = await getMembership(gid);
  const period: Period = PERIODS.some((x) => x.key === sp.p) ? (sp.p as Period) : "temporada";
  const rk = RANKINGS.find((r) => r.key === sp.r) ?? RANKINGS[0];
  const [stats, season] = await Promise.all([
    groupStats(gid, period),
    period === "temporada" ? db.season.findFirst({ where: { groupId: gid, active: true }, orderBy: { startsAt: "desc" } }) : null,
  ]);
  const rows = stats
    .map((s) => ({ s, v: rk.value(s) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v || b.s.games - a.s.games);

  const href = (r: RankingKey, p: Period) => `?r=${r}&p=${p}`;
  return (
    <>
      <PageHeader title="Rankings" subtitle={season?.name} />
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-2xl bg-black/[0.05] p-1 text-sm font-semibold">
        {PERIODS.map((p) => (
          <Link key={p.key} href={href(rk.key, p.key)} replace scroll={false} className={`rounded-xl py-2 text-center ${period === p.key ? "bg-white shadow-sm" : "text-black/50"}`}>{p.label}</Link>
        ))}
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {RANKINGS.map((r) => (
          <Link key={r.key} href={href(r.key, period)} replace scroll={false} className={`chip shrink-0 px-3.5 py-2 text-sm ${rk.key === r.key ? "bg-ink text-white" : "bg-white text-black/60 ring-1 ring-black/5"}`}>
            {r.icon} {r.label}
          </Link>
        ))}
      </div>
      {"hint" in rk && rk.hint && <p className="-mt-2 mb-3 px-1 text-xs text-black/45">{rk.hint}</p>}

      {rows.length === 0 ? (
        <Empty icon="📊" title="Sem dados neste período" text="Os rankings aparecem quando o resultado de uma partida é registrado." />
      ) : (
        <>
          {/* pódio */}
          <div className="mb-4 grid grid-cols-3 items-end gap-2">
            {[1, 0, 2].map((i) => {
              const x = rows[i];
              if (!x) return <div key={i} />;
              return (
                <Link key={x.s.player.id} href={`/p/${gid}/jogadores/${x.s.player.id}`} className={`flex flex-col items-center rounded-3xl px-2 pb-3 pt-4 text-center ${i === 0 ? "pitch-gradient pb-5 text-white" : "bg-white ring-1 ring-black/5"}`}>
                  <span className="text-2xl">{MEDALS[i]}</span>
                  <Avatar name={x.s.player.name} photo={x.s.player.photo} size={i === 0 ? 60 : 48} className="mt-1" />
                  <p className="mt-2 w-full truncate text-sm font-bold">{x.s.player.nickname || x.s.player.name}</p>
                  <p className={`text-sm font-black ${i === 0 ? "text-lime-accent" : "text-pitch-700"}`}>{rk.fmt(x.v)}</p>
                </Link>
              );
            })}
          </div>
          {rows.length > 3 && (
            <div className="card divide-y divide-black/5 p-0">
              {rows.slice(3).map((x, i) => (
                <Link key={x.s.player.id} href={`/p/${gid}/jogadores/${x.s.player.id}`} className={`flex items-center gap-3 px-4 py-2.5 ${x.s.player.id === me.id ? "bg-pitch-50" : ""}`}>
                  <span className="w-6 text-center text-sm font-bold text-black/40">{i + 4}</span>
                  <Avatar name={x.s.player.name} photo={x.s.player.photo} size={32} />
                  <span className="flex-1 truncate font-medium">{x.s.player.nickname || x.s.player.name}</span>
                  <span className="text-xs text-black/40">{x.s.games}j</span>
                  <span className="w-20 text-right font-bold">{rk.fmt(x.v)}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
