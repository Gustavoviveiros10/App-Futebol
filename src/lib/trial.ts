import type { Subscription } from "@prisma/client";

const DAY = 86400_000;
/** Folga entre a primeira cobrança e o fim do acesso (igual à de billing.ts). */
export const GRACE_DAYS = 3;
/** Quantos dias antes da primeira cobrança avisamos. */
export const REMINDER_DAYS = 3;
/** Depois disso o aviso de "teste acabou" não é mais enviado (evita e-mail para testes antigos). */
const ENDED_NOTICE_DAYS = 7;

type Sub = Pick<Subscription, "status" | "currentPeriodEnd" | "externalId" | "lastPaymentId" | "trialReminderAt" | "trialEndedAt">;

/** Teste que nunca virou assinatura paga. */
function unpaidTrial(sub: Sub | null | undefined): sub is Sub & { currentPeriodEnd: Date } {
  return !!sub && sub.status === "TRIALING" && !sub.lastPaymentId && !!sub.currentPeriodEnd;
}

/** Fim do teste: com cartão, é o dia da primeira cobrança; teste cancelado vale até o fim do acesso. */
export function trialEnd(sub: Sub & { currentPeriodEnd: Date }) {
  return sub.externalId ? new Date(sub.currentPeriodEnd.getTime() - GRACE_DAYS * DAY) : sub.currentPeriodEnd;
}

export type TrialState =
  | { kind: "ending"; end: Date; days: number; card: boolean }
  | { kind: "ended" }
  | null;

/** Para o aviso dentro do app: teste acabando (últimos dias) ou acabado sem assinatura. */
export function trialState(sub: Sub | null | undefined, now = new Date()): TrialState {
  if (!unpaidTrial(sub)) return null;
  if (sub.currentPeriodEnd <= now) return { kind: "ended" };
  const end = trialEnd(sub);
  const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY));
  return days <= REMINDER_DAYS ? { kind: "ending", end, days, card: !!sub.externalId } : null;
}

/** Qual e-mail de teste mandar agora (cada um só uma vez). */
export function trialNotice(sub: Sub | null | undefined, now = new Date()): "reminder" | "ended" | null {
  if (!unpaidTrial(sub)) return null;
  if (sub.currentPeriodEnd <= now) {
    const late = now.getTime() - sub.currentPeriodEnd.getTime() > ENDED_NOTICE_DAYS * DAY;
    return sub.trialEndedAt || late ? null : "ended";
  }
  // lembrete só para quem tem cartão cadastrado e vai ser cobrado
  const s = trialState(sub, now);
  return s?.kind === "ending" && s.card && !sub.trialReminderAt ? "reminder" : null;
}

/** "hoje", "amanhã", "em 3 dias". */
export function inDays(days: number) {
  return days <= 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`;
}
