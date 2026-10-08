import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { fmtDate } from "@/lib/format";
import { Avatar, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { signOut } from "../../(auth)/actions";
import { changePassword, saveName } from "./actions";

export const metadata = { title: "Meu perfil" };

export default async function Profile() {
  const user = await requireUser();
  const [{ sub, plan }, stats] = await Promise.all([
    getUserPlan(user.id),
    db.player.findMany({ where: { userId: user.id, active: true }, select: { role: true, photo: true, _count: { select: { matchPlayers: { where: { played: true } } } } } }),
  ]);
  const games = stats.reduce((s, p) => s + p._count.matchPlayers, 0);
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
