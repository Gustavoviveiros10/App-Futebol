import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { groupStats } from "@/lib/stats";
import { peerProfile } from "@/lib/ratings";
import { fmtStars } from "@/lib/format";
import { Stars } from "@/components/Stars";
import { Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { fmtDate } from "@/lib/format";
import { Avatar, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { signOut } from "../../(auth)/actions";
import { changePassword, saveName } from "./actions";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export const metadata = { title: "Meu perfil" };

export default async function Profile() {
  const user = await requireUser();
  const [{ sub, plan }, stats] = await Promise.all([
    getUserPlan(user.id),
    db.player.findMany({ where: { userId: user.id, active: true }, select: { id: true, groupId: true, photo: true, position: true, group: { select: { name: true } } }, orderBy: { joinedAt: "asc" } }),
  ]);
  // números de todas as peladas da conta
  const [perGroup, peer] = await Promise.all([
    Promise.all(stats.map(async (p) => ({ p, s: (await groupStats(p.groupId, "sempre", p.id))[0] }))),
    peerProfile(stats.map((p) => p.id)),
  ]);
  const sum = (k: "games" | "goals" | "assists" | "mvps" | "saves" | "ratingSum" | "ratingCount") => perGroup.reduce((t, g) => t + (g.s?.[k] ?? 0), 0);
  const games = sum("games");
  const ratingCount = sum("ratingCount");
  const avgStars = ratingCount ? sum("ratingSum") / ratingCount / 2 : null;
  const isKeeper = stats.some((p) => p.position === "GOALKEEPER");
  const photo = stats.find((p) => p.photo)?.photo;
  const trialing = sub?.status === "TRIALING" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date();

  return (
    <div className="mx-auto max-w-md px-4 pb-12">
      <PageHeader title="Meu perfil" back="/app" />
      <div className="flex flex-col gap-4">
        <div className="card flex items-center gap-4">
          <Avatar name={user.name} photo={photo} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold">{user.name}</p>
            <p className="truncate text-sm text-fg/50">{user.email}</p>
            <p className="mt-1 text-xs text-fg/45">
              {stats.length} {stats.length === 1 ? "pelada" : "peladas"} · {games} {games === 1 ? "jogo" : "jogos"} disputados
            </p>
          </div>
        </div>

        <div>
          <p className="section-title">Minhas estatísticas</p>
          <div className="grid grid-cols-3 gap-2" data-testid="my-stats">
            <Stat label="Jogos" value={games} />
            <Stat label="Gols" value={sum("goals")} />
            <Stat label="Assistências" value={sum("assists")} />
            <Stat label="Nota média" value={<span className="flex items-baseline gap-1">{fmtStars(avgStars)}<small className="text-sm text-gold">★</small></span>} />
            <Stat label="Craque" value={`${sum("mvps")}x`} />
            {isKeeper ? <Stat label="Defesas" value={sum("saves")} /> : <Stat label="Peladas" value={stats.length} />}
          </div>
        </div>

        <div>
          <p className="section-title">Avaliações dos colegas</p>
          <div className="card">
            {peer.count === 0 ? (
              <p className="text-sm text-fg/50">Ainda sem avaliações. Elas aparecem depois que os colegas avaliam as partidas.</p>
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
                <p className="mt-2 text-xs text-fg/45">{peer.count} {peer.count === 1 ? "avaliação" : "avaliações"}, todas anônimas.</p>
                {peer.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {peer.tags.map((t) => (
                      <span key={t.tag} className={`chip ${t.bad ? "bg-red-500/15 text-red-400" : "bg-fg/[0.06] text-fg/75"}`}>{t.tag} <b>{t.count}</b></span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {perGroup.length > 0 && (
          <div>
            <p className="section-title">Por pelada</p>
            <div className="card divide-y divide-fg/[0.07] p-0">
              {perGroup.map(({ p, s }) => (
                <Link key={p.id} href={`/p/${p.groupId}/jogadores/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{p.group.name}</b>
                    <small className="text-fg/50">{[plural(s?.games ?? 0, "jogo"), plural(s?.goals ?? 0, "gol"), plural(s?.assists ?? 0, "assistência")].join(" · ")}{s?.mvps ? ` · ${s.mvps}x craque` : ""}</small>
                  </span>
                  <ChevronRight size={18} className="text-fg/25" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/app/planos" className="card flex items-center gap-3 transition hover:bg-surface-2">
          <div className="flex-1">
            <p className="section-title px-0">Meu plano</p>
            <p className="text-lg font-extrabold">{PLANS[plan].name}</p>
            <p className="text-sm text-fg/50">{trialing ? `Teste grátis até ${fmtDate(sub!.currentPeriodEnd!)}` : PLANS[plan].tagline}</p>
          </div>
          <span className="text-sm font-semibold text-accent">Ver planos</span>
          <ChevronRight className="text-fg/25" />
        </Link>

        <section className="card">
          <p className="mb-3 font-extrabold">Dados pessoais</p>
          <ActionForm action={saveName} className="flex flex-col gap-2">
            <label className="label" htmlFor="name">Seu nome</label>
            <input className="input" id="name" name="name" defaultValue={user.name} required />
            <SubmitButton className="btn-ghost w-full">Salvar nome</SubmitButton>
          </ActionForm>
        </section>

        <section className="card">
          <p className="mb-3 font-extrabold">Trocar senha</p>
          <ActionForm action={changePassword} className="flex flex-col gap-2">
            <input className="input" name="current" type="password" autoComplete="current-password" placeholder="Senha atual" aria-label="Senha atual" required />
            <input className="input" name="password" type="password" autoComplete="new-password" placeholder="Nova senha (mín. 8 caracteres)" aria-label="Nova senha" required />
            <SubmitButton className="btn-ghost w-full">Trocar senha</SubmitButton>
          </ActionForm>
        </section>

        <form action={signOut}>
          <SubmitButton className="btn-ghost w-full"><LogOut size={18} /> Sair da conta</SubmitButton>
        </form>
      </div>
    </div>
  );
}
