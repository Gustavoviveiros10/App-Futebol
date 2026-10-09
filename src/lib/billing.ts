import "server-only";
import type { Plan, Subscription } from "@prisma/client";
import { db } from "./db";
import type { AsaasPayment } from "./asaas";

const DAY = 86400_000;
const GRACE_DAYS = 3;

function addMonth(d: Date) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + 1);
  return r;
}

/** Assinatura com cobrança recorrente já paga ao menos uma vez. */
export function isPaying(sub: Subscription | null | undefined) {
  return !!sub?.externalId && !!sub.lastPaymentId;
}

/** Checkout aberto que ainda não foi pago. */
export function hasPendingCheckout(sub: Subscription | null | undefined) {
  return !!sub?.externalId && !!sub.pendingPlan && !sub.lastPaymentId;
}

function planFromRef(ref?: string | null): Plan | null {
  const p = ref?.split(":")[1];
  return p === "PRO" || p === "PREMIUM" ? p : null;
}

/** Aplica um evento de pagamento do Asaas. Idempotente: o Asaas reenvia eventos. */
export async function applyPaymentEvent(event: string, payment: AsaasPayment) {
  if (!payment?.subscription) return "ignorado: sem assinatura";
  const sub = await db.subscription.findFirst({ where: { externalId: payment.subscription } });
  if (!sub) return "ignorado: assinatura desconhecida";

  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      if (sub.lastPaymentId === payment.id) return "já aplicado";
      const now = new Date();
      const due = new Date(`${payment.dueDate}T12:00:00Z`);
      let end = new Date(addMonth(due).getTime() + GRACE_DAYS * DAY);
      // quem paga durante o teste não perde os dias que faltavam
      if (sub.status === "TRIALING" && sub.currentPeriodEnd && sub.currentPeriodEnd > now) {
        const afterTrial = addMonth(sub.currentPeriodEnd);
        if (afterTrial > end) end = afterTrial;
      }
      if (sub.currentPeriodEnd && sub.currentPeriodEnd > end) end = sub.currentPeriodEnd;
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          plan: sub.pendingPlan ?? (sub.lastPaymentId ? sub.plan : planFromRef(payment.externalReference) ?? sub.plan),
          status: "ACTIVE",
          currentPeriodEnd: end,
          pendingPlan: null,
          checkoutUrl: null,
          lastPaymentId: payment.id,
        },
      });
      return "pago";
    }
    case "PAYMENT_CREATED":
    case "PAYMENT_UPDATED":
      if (payment.status === "PENDING" && payment.invoiceUrl) await db.subscription.update({ where: { id: sub.id }, data: { checkoutUrl: payment.invoiceUrl } });
      return "fatura salva";
    case "PAYMENT_OVERDUE":
      if (!isPaying(sub)) return "ignorado: checkout não pago";
      await db.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE", checkoutUrl: payment.invoiceUrl ?? sub.checkoutUrl } });
      return "em atraso";
    case "PAYMENT_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED":
      await db.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED" } });
      return "estornado";
    default:
      return "ignorado";
  }
}

/** Assinatura apagada no painel do Asaas: para de cobrar, acesso segue até o fim do período. */
export async function applySubscriptionDeleted(asaasSubscriptionId: string) {
  await db.subscription.updateMany({
    where: { externalId: asaasSubscriptionId },
    data: { externalId: null, pendingPlan: null, checkoutUrl: null },
  });
}
