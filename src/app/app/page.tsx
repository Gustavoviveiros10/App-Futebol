import Link from "next/link";
import { ArrowRight, ChevronRight, Plus, Search } from "lucide-react";
import { Avatar } from "@/components/ui";
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
import { openInvite } from "./actions";
import { InstallApp } from "@/components/InstallApp";

export const metadata = { title: "Minhas peladas" };

export default async function MyGroups() {
  const user = await requireUser();
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
  const organize = memberships.filter((m) => m.role === "ORGANIZER");
  const play = memberships.filter((m) => m.role !== "ORGANIZER");
  const card = (m: (typeof memberships)[number]) => (
    <div key={m.id} className="flex flex-col gap-2">
      <Link href={`/p/${m.groupId}`} prefetch={false} className="card flex items-center gap-4 transition hover:bg-surface-2">
        <div className="pitch-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
          <span className="font-display text-xl font-bold text-accent">{m.group.name.slice(0, 1).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{m.group.name}</p>
          <p className="text-sm text-fg/45">
            {m.role === "ORGANIZER" ? (m.group.ownerId === user.id ? "Dono" : "Administrador") : "Jogador"} · {m.group._count.players} jogadores
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
  );

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-12">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <Link href="/app/perfil" className="flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-sm font-semibold text-fg/70 ring-1 ring-fg/[0.08] hover:bg-surface" aria-label="Meu perfil">
          Perfil <Avatar name={user.name} size={28} />
        </Link>
      </header>

      <p className="section-title mt-4 px-0">Plano {PLANS[plan].name}</p>
      <h1 className="text-5xl">Olá, {user.name.split(" ")[0]}</h1>

      <InstallApp className="mt-5" />

      {/* Peladas que organizo */}
      <section className="mt-6" data-testid="organizo">
        <p className="section-title px-0">Peladas que organizo</p>
        <div className="flex flex-col gap-2">
          {organize.map(card)}
          {canCreate ? (
            <Link href="/app/nova" className="btn-primary w-full py-4">
              <Plus size={20} /> {owned ? "Criar nova pelada" : "Criar minha pelada"}
            </Link>
          ) : plan === "FREE" ? (
            <div className="pitch-gradient overflow-hidden rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <LogoMark size={22} />
                <span className="chip bg-accent text-bg">PRO</span>
              </div>
              <p className="mt-4 font-display text-3xl font-bold uppercase leading-none">Organize a sua pelada</p>
              <p className="mt-2 text-sm leading-relaxed text-fg/60">Assine o Pro para criar sua pelada, cadastrar a galera, controlar presença, sortear times e acompanhar os rankings.</p>
              <Link href="/app/planos?plano=PRO" className="btn-primary mt-5 w-full">
                Assinar o Pro · {TRIAL_DAYS} dias grátis <ArrowRight size={18} />
              </Link>
              <p className="mt-2 text-center text-xs text-fg/40">Sem cartão no teste. Depois, {money(PLANS.PRO.priceCents)}/mês.</p>
            </div>
          ) : plan === "PRO" ? (
            <Link href="/app/planos?plano=PREMIUM" className="flex items-center gap-3 rounded-2xl border border-dashed border-fg/15 p-4 transition hover:border-gold/50 hover:bg-surface">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><Plus size={22} /></span>
              <span className="flex-1">
                <b className="flex items-center gap-2">Criar nova pelada <span className="chip bg-gold/15 text-gold">Premium</span></b>
                <small className="text-fg/55">No Premium você organiza até {PLANS.PREMIUM.maxGroups} peladas e tem o financeiro completo.</small>
              </span>
              <ChevronRight className="text-fg/25" />
            </Link>
          ) : (
            <p className="text-center text-xs text-fg/45">Você já organiza o máximo de {PLANS[plan].maxGroups} peladas do seu plano.</p>
          )}
        </div>
      </section>

      {/* Peladas que participo */}
      <section className="mt-6" data-testid="participo">
        <p className="section-title px-0">Peladas que participo</p>
        <div className="flex flex-col gap-2">
          {play.length ? play.map(card) : <p className="card text-sm text-fg/55">Você ainda não joga em nenhuma pelada. Entre pelo link de convite ou encontre uma partida aberta.</p>}
        </div>
      </section>

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
