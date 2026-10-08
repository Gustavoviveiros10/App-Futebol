import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronRight, LogOut, Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { fmtTime, money } from "@/lib/format";
import { START_EARLY_MIN } from "@/lib/matches";
import { StartMatchButton } from "@/components/StartMatchButton";
import { startMatch } from "../p/[gid]/partidas/actions";
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
      include: {
        group: {
          include: {
            _count: { select: { players: { where: { active: true } } } },
            // partida das próximas 24 h, para o botão "Iniciar partida"
            matches: { where: { status: { in: ["SCHEDULED", "CLOSED", "DRAWN"] }, date: { lte: new Date(Date.now() + 86400_000) } }, orderBy: { date: "asc" }, take: 1 },
          },
        },
      },
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

      {[
        { title: "Peladas que organizo", list: memberships.filter((m) => m.role === "ORGANIZER") },
        { title: "Peladas que jogo", list: memberships.filter((m) => m.role !== "ORGANIZER") },
      ].filter((sec) => sec.list.length).map((sec) => (
        <div key={sec.title} className="mt-6">
        <p className="section-title px-0">{sec.title}</p>
        <div className="flex flex-col gap-2">
          {sec.list.map((m) => (
            <div key={m.id} className="flex flex-col gap-2">
            <Link href={m.role === "ORGANIZER" ? `/p/${m.groupId}/modo/organizador` : `/p/${m.groupId}`} prefetch={false} className="card flex items-center gap-4 transition hover:bg-surface-2">
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
            {m.role === "ORGANIZER" && m.group.matches[0] && (
              <StartMatchButton
                startsAt={m.group.matches[0].date.toISOString()}
                unlockLabel={fmtTime(new Date(m.group.matches[0].date.getTime() - START_EARLY_MIN * 60_000), m.group.timezone)}
                started={!!m.group.matches[0].startedAt}
                controlHref={`/p/${m.groupId}/partidas/${m.group.matches[0].id}/controle`}
                action={startMatch.bind(null, m.groupId, m.group.matches[0].id)}
              />
            )}
            </div>
          ))}
        </div>
        </div>
      ))}

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

      <Link href="/jogar" className="card mt-4 flex items-center gap-3 transition hover:ring-accent/40">
        <Search size={20} className="shrink-0 text-accent" />
        <span className="flex-1">
          <b className="block">Encontrar partidas</b>
          <small className="text-fg/55">Partidas com vaga abertas para quem quiser jogar</small>
        </span>
        <ChevronRight className="text-fg/25" />
      </Link>

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
