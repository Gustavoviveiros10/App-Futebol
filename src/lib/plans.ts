import type { Plan, Subscription } from "@prisma/client";

export const PLANS: Record<Plan, { name: string; priceCents: number; maxPlayers: number | null; features: string[] }> = {
  FREE: {
    name: "Gratuito",
    priceCents: 0,
    maxPlayers: 10,
    features: ["Até 10 jogadores", "Partidas e confirmação de presença", "Sorteio de times", "Financeiro básico"],
  },
  PRO: {
    name: "Pro",
    priceCents: 1990,
    maxPlayers: null,
    features: ["Jogadores ilimitados", "Financeiro completo", "Sorteio equilibrado", "Estatísticas e rankings", "Histórico completo"],
  },
  PREMIUM: {
    name: "Premium",
    priceCents: 2990,
    maxPlayers: null,
    features: ["Tudo do Pro", "Personalização da pelada", "Recursos avançados (em breve)"],
  },
};

export const TRIAL_DAYS = 30;

/** Plano efetivo: assinatura vencida/cancelada volta para o gratuito. */
export function effectivePlan(sub: Subscription | null | undefined): Plan {
  if (!sub) return "FREE";
  if (sub.status === "CANCELED") return "FREE";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return "FREE";
  return sub.plan;
}

export function playerLimit(sub: Subscription | null | undefined) {
  return PLANS[effectivePlan(sub)].maxPlayers;
}
