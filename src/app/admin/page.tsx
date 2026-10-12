import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PLANS } from "@/lib/plans";
import { fmtDate } from "@/lib/format";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { signOutUser } from "./actions";

export const metadata = { title: "Painel da plataforma", robots: { index: false } };
export const dynamic = "force-dynamic";

const DAY = 86400_000;
const STATUS = { ACTIVE: "ativa", TRIALING: "teste grátis", PAST_DUE: "atrasada", CANCELED: "cancelada" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requirePlatformAdmin();
  const q = ((await searchParams).q ?? "").trim();
  const now = Date.now();
  const d7 = new Date(now - 7 * DAY);
  const d30 = new Date(now - 30 * DAY);

  const [
    users,
    users7,
    users30,
    logins7,
    logins30,
    groups,
    groups30,
    guests,
    guests30,
    matches30,
    rsvps30,
    subs,
    recent,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count({ where: { createdAt: { gte: d30 } } }),
    db.session.groupBy({ by: ["userId"], where: { createdAt: { gte: d7 } } }),
    db.session.groupBy({ by: ["userId"], where: { createdAt: { gte: d30 } } }),
    db.group.count(),
    db.group.count({ where: { createdAt: { gte: d30 } } }),
    db.player.count({ where: { userId: null } }),
    db.player.count({ where: { userId: null, createdAt: { gte: d30 } } }),
    db.match.count({ where: { date: { gte: d30, lte: new Date(now) }, status: { not: "CANCELED" } } }),
    db.matchPlayer.count({ where: { status: "CONFIRMED", respondedAt: { gte: d30 } } }),
    db.subscription.groupBy({ by: ["plan", "status"], _count: true }),
    db.user.findMany({
      where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
        _count: { select: { ownedGroups: true, players: true } },
        sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);

  const paying = subs.filter((s) => s.plan !== "FREE" && s.status === "ACTIVE").reduce((t, s) => t + s._count, 0);
  const trialing = subs.filter((s) => s.status === "TRIALING").reduce((t, s) => t + s._count, 0);
  const mrr = subs
    .filter((s) => s.plan !== "FREE" && s.status === "ACTIVE")
    .reduce((t, s) => t + s._count * PLANS[s.plan].priceCents, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12">
      <PageHeader title="Painel" subtitle="Visão geral da plataforma" back="/app" />
      <div className="flex flex-col gap-5">
        <section>
          <p className="section-title">Contas</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="admin-users">
            <Stat label="Contas criadas" value={users} />
            <Stat label="Novas em 7 dias" value={users7} tone="green" />
            <Stat label="Novas em 30 dias" value={users30} />
            <Stat label="Entraram em 7 dias" value={logins7.length} />
            <Stat label="Entraram em 30 dias" value={logins30.length} />
            <Stat label="Jogadores sem conta" value={guests} />
            <Stat label="Sem conta, em 30 dias" value={guests30} />
          </div>
        </section>

        <section>
          <p className="section-title">Uso</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Peladas" value={groups} />
            <Stat label="Peladas novas (30d)" value={groups30} />
            <Stat label="Partidas (30d)" value={matches30} />
            <Stat label="Presenças confirmadas (30d)" value={rsvps30} />
          </div>
        </section>

        <section>
          <p className="section-title">Assinaturas</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Pagantes" value={paying} tone="green" />
            <Stat label="Em teste grátis" value={trialing} tone="amber" />
            <Stat label="Receita mensal" value={(mrr / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          </div>
          {subs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {subs.map((s) => (
                <Badge key={`${s.plan}-${s.status}`}>
                  {PLANS[s.plan].name} · {STATUS[s.status]}: {s._count}
                </Badge>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="section-title">Contas {q ? `com “${q}”` : "mais recentes"}</p>
          <form className="mb-2 flex gap-2">
            <input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="input flex-1" />
            <button className="btn btn-ghost btn-sm">Buscar</button>
          </form>
          <div className="card divide-y divide-fg/[0.06] p-0" data-testid="admin-user-list">
            {recent.length === 0 && <p className="p-4 text-sm text-fg/50">Nenhuma conta encontrada.</p>}
            {recent.map((u) => {
              const sub = u.subscription;
              const lastLogin = u.sessions[0]?.createdAt;
              return (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{u.name}</p>
                    <p className="truncate text-sm text-fg/50">{u.email}</p>
                    <p className="mt-1 text-xs text-fg/45">
                      Criada em {fmtDate(u.createdAt)} · último acesso {lastLogin ? fmtDate(lastLogin) : "—"} · {u._count.ownedGroups} pelada(s) própria(s) · joga em {u._count.players}
                    </p>
                  </div>
                  <Badge tone={sub && sub.plan !== "FREE" ? (sub.status === "ACTIVE" ? "green" : "amber") : "gray"}>
                    {PLANS[sub?.plan ?? "FREE"].name}
                    {sub && sub.plan !== "FREE" && sub.status !== "ACTIVE" ? ` · ${STATUS[sub.status]}` : ""}
                  </Badge>
                  {u.id !== admin.id && u.sessions.length > 0 && (
                    <form action={signOutUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="text-xs font-semibold text-red-400 hover:underline" title="Encerra as sessões abertas desta conta">
                        Desconectar
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
