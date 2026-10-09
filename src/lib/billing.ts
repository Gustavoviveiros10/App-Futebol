import "server-only";
import type { Plan, Subscription } from "@prisma/client";
import { db } from "./db";
import { PLANS, TRIAL_ENABLED } from "./plans";
import { billingEnabled, cancelSubscription, customerSubscriptions, getPayment, subscriptionPayments, updateSubscriptionValue, type AsaasPayment, type AsaasSubscription } from "./asaas";

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

/** O teste grátis só existe com a cobrança ligada (o cartão é cadastrado no Asaas). */
export function trialAvailable() {
  return TRIAL_ENABLED && billingEnabled();
}

/** Só quem nunca testou nem assinou pode começar o teste. */
export function canStartTrial(sub: Subscription | null | undefined) {
  return !sub?.currentPeriodEnd && !sub?.lastPaymentId && !sub?.externalId;
}

/** Foi para a página de cadastrar o cartão do teste e ainda não concluiu. */
export function hasPendingTrialCheckout(sub: Subscription | null | undefined) {
  return !!sub?.checkoutId && !sub.externalId;
}

/** Em teste com cartão cadastrado: a primeira cobrança ainda não aconteceu. */
export function isCardTrial(sub: Subscription | null | undefined) {
  return sub?.status === "TRIALING" && !!sub.externalId && !sub.lastPaymentId;
}

/** Cartão cadastrado: começa o teste. O acesso vai até a primeira cobrança (mais a folga). */
async function activateTrial(sub: Subscription, s: AsaasSubscription) {
  const end = new Date(new Date(`${s.nextDueDate.slice(0, 10)}T12:00:00Z`).getTime() + GRACE_DAYS * DAY);
  await db.subscription.update({
    where: { id: sub.id },
    data: { provider: "asaas", externalId: s.id, status: "TRIALING", plan: sub.pendingPlan ?? sub.plan, currentPeriodEnd: end, pendingPlan: null, checkoutId: null, checkoutUrl: null },
  });
  return "teste iniciado";
}

/** Webhook SUBSCRIPTION_CREATED: a assinatura nasce quando a pessoa conclui o cadastro do cartão. */
export async function applySubscriptionCreated(s: AsaasSubscription) {
  if (!s?.id || !s.customer) return "ignorado";
  const sub = await db.subscription.findFirst({ where: { customerId: s.customer, checkoutId: { not: null }, externalId: null } });
  return sub ? activateTrial(sub, s) : "ignorado";
}

/** Upgrade escolhido, esperando o pagamento da diferença. */
export function hasPendingUpgrade(sub: Subscription | null | undefined) {
  return isPaying(sub) && !!sub!.upgradePaymentId && !!sub!.pendingPlan;
}

/** Diferença paga: o plano maior vale na hora e as próximas mensalidades passam a ter o novo valor. */
async function applyUpgrade(sub: Subscription) {
  const plan = sub.pendingPlan;
  if (!plan || !sub.externalId) return "ignorado";
  await updateSubscriptionValue(sub.externalId, PLANS[plan].priceCents, `Jogus Connect ${PLANS[plan].name}`);
  await db.subscription.update({ where: { id: sub.id }, data: { plan, pendingPlan: null, upgradePaymentId: null, checkoutUrl: null } });
  return "upgrade pago";
}

function planFromRef(ref?: string | null): Plan | null {
  const p = ref?.split(":")[1];
  return p === "PRO" || p === "PREMIUM" ? p : null;
}

/** Aplica um evento de pagamento do Asaas. Idempotente: o Asaas reenvia eventos. */
export async function applyPaymentEvent(event: string, payment: AsaasPayment) {
  if (!payment?.subscription) {
    // cobrança avulsa: diferença de upgrade
    const up = payment?.id ? await db.subscription.findFirst({ where: { upgradePaymentId: payment.id } }) : null;
    if (!up) return "ignorado: sem assinatura";
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") return applyUpgrade(up);
    if (event === "PAYMENT_DELETED") {
      await db.subscription.update({ where: { id: up.id }, data: { upgradePaymentId: null, pendingPlan: null, checkoutUrl: null } });
      return "upgrade cancelado";
    }
    return "ignorado";
  }
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
      // pendingPlan só vale no primeiro pagamento; numa renovação ele é de um upgrade ainda não pago
      const first = !sub.lastPaymentId;
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          // no teste com cartão vale o plano atual (a pessoa pode ter trocado durante o teste)
          plan: first ? (sub.pendingPlan ?? (isCardTrial(sub) ? sub.plan : (planFromRef(payment.externalReference) ?? sub.plan))) : sub.plan,
          status: "ACTIVE",
          currentPeriodEnd: end,
          ...(first || !sub.upgradePaymentId ? { pendingPlan: null, checkoutUrl: null } : {}),
          lastPaymentId: payment.id,
        },
      });
      return "pago";
    }
    case "PAYMENT_CREATED":
    case "PAYMENT_UPDATED":
      if (payment.status === "PENDING" && payment.invoiceUrl && !sub.upgradePaymentId) await db.subscription.update({ where: { id: sub.id }, data: { checkoutUrl: payment.invoiceUrl } });
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

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

/**
 * Confere no Asaas se a fatura em aberto já foi paga (reserva para quando o webhook não chega).
 * Só consulta quando há checkout pendente, upgrade pendente, atraso ou renovação perto. Devolve true se mudou algo.
 */
export async function syncFromAsaas(sub: Subscription | null | undefined) {
  if (sub && hasPendingTrialCheckout(sub) && sub.customerId) {
    try {
      const s = (await customerSubscriptions(sub.customerId)).sort((a, b) => (b.dateCreated ?? "").localeCompare(a.dateCreated ?? ""))[0];
      if (s) return (await activateTrial(sub, s)) === "teste iniciado";
    } catch (e) {
      console.error("asaas sync teste", e);
    }
    return false;
  }
  if (sub && hasPendingUpgrade(sub)) {
    try {
      const p = await getPayment(sub.upgradePaymentId!);
      if (PAID.has(p.status)) return (await applyUpgrade(sub)) === "upgrade pago";
    } catch (e) {
      console.error("asaas sync upgrade", e);
    }
    return false;
  }
  // renovação: a mensalidade vence uns dias antes do fim do período
  const renewing = (isPaying(sub) || isCardTrial(sub)) && !!sub!.currentPeriodEnd && sub!.currentPeriodEnd.getTime() - Date.now() < (GRACE_DAYS + 1) * DAY;
  if (!sub?.externalId || !(hasPendingCheckout(sub) || sub.status === "PAST_DUE" || renewing)) return false;
  try {
    const paid = (await subscriptionPayments(sub.externalId)).filter((p) => PAID.has(p.status)).sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0];
    if (!paid && isCardTrial(sub) && sub.currentPeriodEnd! < new Date()) {
      // teste acabou e a primeira cobrança não passou no cartão: para de cobrar
      await cancelSubscription(sub.externalId).catch(() => undefined);
      await db.subscription.update({ where: { id: sub.id }, data: { externalId: null, checkoutUrl: null } });
      return true;
    }
    if (!paid || paid.id === sub.lastPaymentId) return false;
    return (await applyPaymentEvent("PAYMENT_RECEIVED", { ...paid, subscription: paid.subscription ?? sub.externalId })) === "pago";
  } catch (e) {
    console.error("asaas sync", e);
    return false;
  }
}
