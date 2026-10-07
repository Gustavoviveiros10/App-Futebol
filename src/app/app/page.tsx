import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronRight, LogOut, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { money } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Logo, LogoMark } from "@/components/Logo";
import { signOut } from "../(auth)/actions";
import { openInvite } from "./actions";

export const metadata = { title: "Minhas peladas" };

export default async function MyGroups({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const user = await requireUser();
  const { todas } = await searchParams;
  const [memberships, { plan, canCreate, owned }] = await Promise.all([
    db.player.findMany({
      where: { userId: user.id, active: true },
      include: { group: { include: { _count: { select: { players: { where: { active: true } } } } } } },
      orderBy: { createdAt: "asc" },
    }),
    getUserPlan(user.id),
  ]);
  if (memberships.length === 1 && !todas) redirect(`/p/${memberships[0].groupId}`);

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-12">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <form action={signOut}>
          <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-fg/50 hover:text-fg">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </header>

      <p className="section-title mt-4 px-0">Plano {PLANS[plan].name}</p>
      <h1 className="text-5xl">Olá, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 text-fg/55">{memberships.length ? "Escolha uma pelada." : "Bem-vindo. Entre na pelada da sua turma ou organize a sua."}</p>

      {memberships.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {memberships.map((m) => (
            <Link key={m.id} href={`/p/${m.groupId}`} className="card flex items-center gap-4 transition hover:bg-surface-2">
              <div className="pitch-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                <span className="font-display text-xl font-bold text-accent">{m.group.name.slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{m.group.name}</p>
                <p className="text-sm text-fg/45">
                  {m.role === "ORGANIZER" ? "Organizador" : "Jogador"} · {m.group._count.players} jogadores
                </p>
              </div>
              <ChevronRight className="text-fg/25" />
            </Link>
          ))}
        </div>
      )}

      {/* Organizar a própria pelada */}
      {canCreate ? (
        <Link href="/app/nova" className="btn-primary mt-4 w-full py-4">
          <Plus size={20} /> Criar minha pelada
        </Link>
      ) : (
        owned === 0 && (
          <div className="pitch-gradient mt-6 overflow-hidden rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <LogoMark size={22} />
              <span className="chip bg-accent text-bg">PRO</span>
            </div>
            <p className="mt-4 font-display text-3xl font-bold uppercase leading-none">Organize o seu próprio futebol</p>
            <p className="mt-2 text-sm leading-relaxed text-fg/60">
              Crie sua pelada, cadastre a galera, controle presença e mensalidades, sorteie times e acompanhe os rankings.
            </p>
            <Link href="/app/planos" className="btn-primary mt-5 w-full">
              Testar o Pro grátis por {TRIAL_DAYS} dias <ArrowRight size={18} />
            </Link>
            <p className="mt-2 text-center text-xs text-fg/40">Sem cartão. Depois, {money(PLANS.PRO.priceCents)}/mês.</p>
          </div>
        )
      )}
      {!canCreate && owned > 0 && (
        <Link href="/app/planos" className="mt-4 block text-center text-sm font-semibold text-fg/50 hover:text-fg">
          Quer organizar mais peladas? Ver planos
        </Link>
      )}

      {/* Entrar por convite */}
      <div className="card mt-4">
        <p className="font-bold">Vai jogar na pelada de alguém?</p>
        <p className="mb-3 text-sm text-fg/50">Cole aqui o link de convite que o organizador mandou.</p>
        <ActionForm action={openInvite} className="flex flex-col gap-2">
          <input className="input" name="code" placeholder="https://.../convite/..." autoComplete="off" required />
          <SubmitButton className="btn-ghost w-full">Entrar na pelada</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
