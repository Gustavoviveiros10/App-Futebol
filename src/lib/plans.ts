import type { Plan, PlanCycle, Subscription } from "@prisma/client";

/**
 * Qualquer pessoa cria conta grátis e participa de peladas como jogador.
 * Criar e administrar a própria pelada é um recurso pago (Pro/Premium).
 */
export const PLANS: Record<Plan, { name: string; priceCents: number; yearlyCents: number; maxGroups: number; tagline: string; features: string[] }> = {
  FREE: {
    name: "Jogador",
    priceCents: 0,
    yearlyCents: 0,
    maxGroups: 0,
    tagline: "Para quem joga",
    features: ["Entrar em peladas por convite", "Confirmar presença", "Ver times, resultados e rankings", "Acompanhar seu financeiro"],
  },
  PRO: {
    name: "Pro",
    priceCents: 2499,
    yearlyCents: 24900, // ~10 meses: 2 de graça
    maxGroups: 1,
    tagline: "Para quem organiza",
    features: ["Sua própria pelada", "Jogadores ilimitados", "Sorteio equilibrado", "Estatísticas, craque e rankings", "Partidas abertas no Quero jogar"],
  },
  PREMIUM: {
    name: "Premium",
    priceCents: 3999,
    yearlyCents: 39900,
    maxGroups: 3,
    tagline: "Para quem organiza várias",
    features: ["Tudo do Pro", "Até 3 peladas", "Financeiro completo: mensalidades, avulsos, despesas e caixa", "Divisão do churrasco", "Personalização da pelada"],
  },
};

/** Valor cobrado a cada ciclo. */
export function planPrice(plan: Plan, cycle: PlanCycle = "MONTHLY") {
  return cycle === "YEARLY" ? PLANS[plan].yearlyCents : PLANS[plan].priceCents;
}

/** "R$ 24,99/mês" ou "R$ 249,00/ano". */
export const cycleSuffix = (cycle: PlanCycle = "MONTHLY") => (cycle === "YEARLY" ? "/ano" : "/mês");

/** Quanto o anual sai por mês (para comparar com o mensal). */
export const yearlyPerMonth = (plan: Plan) => Math.round(PLANS[plan].yearlyCents / 12);

/** Valor mínimo de uma cobrança no Asaas. */
const MIN_CHARGE_CENTS = 500;

/**
 * Diferença cobrada ao subir de plano numa assinatura paga.
 * Mensal: a diferença do mês inteiro. Anual: proporcional aos dias que faltam do ano já pago.
 */
export function upgradeCostCents(from: Plan, to: Plan, cycle: PlanCycle, periodEnd: Date | null | undefined, now = new Date()) {
  const diff = planPrice(to, cycle) - planPrice(from, cycle);
  if (diff <= 0) return 0;
  if (cycle !== "YEARLY" || !periodEnd) return diff;
  const days = Math.max(0, (periodEnd.getTime() - now.getTime()) / 86400_000 - 3); // tira a folga do fim do período
  return Math.max(MIN_CHARGE_CENTS, Math.round((diff * Math.min(365, Math.ceil(days))) / 365));
}

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
