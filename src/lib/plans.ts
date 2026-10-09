import type { Plan, Subscription } from "@prisma/client";

/**
 * Qualquer pessoa cria conta grátis e participa de peladas como jogador.
 * Criar e administrar a própria pelada é um recurso pago (Pro/Premium).
 */
export const PLANS: Record<Plan, { name: string; priceCents: number; maxGroups: number; tagline: string; features: string[] }> = {
  FREE: {
    name: "Jogador",
    priceCents: 0,
    maxGroups: 0,
    tagline: "Para quem joga",
    features: ["Entrar em peladas por convite", "Confirmar presença", "Ver times, resultados e rankings", "Acompanhar seu financeiro"],
  },
  PRO: {
    name: "Pro",
    priceCents: 1990,
    maxGroups: 1,
    tagline: "Para quem organiza",
    features: ["Sua própria pelada", "Jogadores ilimitados", "Sorteio equilibrado", "Estatísticas, craque e rankings", "Partidas abertas no Quero jogar"],
  },
  PREMIUM: {
    name: "Premium",
    priceCents: 2990,
    maxGroups: 3,
    tagline: "Para quem organiza várias",
    features: ["Tudo do Pro", "Até 3 peladas", "Financeiro completo: mensalidades, avulsos, despesas e caixa", "Divisão do churrasco", "Personalização da pelada"],
  },
};

export const TRIAL_DAYS = 14;
/** Teste grátis com cartão cadastrado: a primeira cobrança só acontece depois de TRIAL_DAYS. */
export const TRIAL_ENABLED = true;

/** Plano efetivo: assinatura vencida ou cancelada volta para o gratuito. */
export function effectivePlan(sub: Subscription | null | undefined): Plan {
  if (!sub) return "FREE";
  if (sub.status === "CANCELED") return "FREE";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return "FREE";
  return sub.plan;
}

export function isTrialing(sub: Subscription | null | undefined) {
  return !!sub && sub.status === "TRIALING" && !!sub.currentPeriodEnd && sub.currentPeriodEnd > new Date();
}
