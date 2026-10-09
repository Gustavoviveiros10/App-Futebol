"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import type { ActionState } from "@/lib/actions";
import { AsaasError, billingEnabled, cancelSubscription, cleanCpfCnpj, createCustomer, createSubscription, firstOpenPayment, updateSubscriptionValue } from "@/lib/asaas";
import { hasPendingCheckout, isPaying } from "@/lib/billing";

type PaidPlan = "PRO" | "PREMIUM";
const paid = (p: unknown): p is PaidPlan => p === "PRO" || p === "PREMIUM";
const desc = (p: PaidPlan) => `Jogus Connect ${PLANS[p].name}`;

function fail(e: unknown): ActionState {
  console.error("asaas", e);
  return { error: e instanceof AsaasError && e.status === 400 ? `O pagamento recusou os dados: ${e.message}` : "Não deu para falar com o pagamento agora. Tente de novo em instantes." };
}

/** Cria a assinatura mensal no Asaas e leva para a fatura (Pix, cartão ou boleto). */
export async function subscribe(plan: PaidPlan, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!paid(plan)) return { error: "Plano inválido." };
  if (!billingEnabled()) return { error: "A assinatura ainda não está disponível." };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (isPaying(sub)) return { error: "Você já tem uma assinatura ativa. Use a opção de mudar de plano." };
  if (plan === "PRO" && (await db.group.count({ where: { ownerId: user.id } })) > PLANS.PRO.maxGroups)
    return { error: "Você organiza mais peladas do que o Pro permite. Escolha o Premium." };

  let url: string | undefined;
  try {
    let customerId = sub?.customerId ?? null;
    if (!customerId) {
      const doc = cleanCpfCnpj(String(form.get("cpfCnpj") ?? ""));
      if (!doc) return { error: "Confira o CPF (ou CNPJ). Ele é exigido para emitir a cobrança." };
      customerId = (await createCustomer({ name: user.name, email: user.email, cpfCnpj: doc, userId: user.id })).id;
      // guarda o cliente já, para não pedir o CPF de novo se algo falhar depois
      await db.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, plan: "FREE", status: "ACTIVE", provider: "asaas", customerId },
        update: { provider: "asaas", customerId },
      });
    }
    // checkout anterior não pago: troca pelo novo
    if (hasPendingCheckout(sub) && sub!.externalId) await cancelSubscription(sub!.externalId).catch(() => undefined);

    const created = await createSubscription({ customer: customerId, valueCents: PLANS[plan].priceCents, description: desc(plan), userId: user.id, plan });
    const payment = await firstOpenPayment(created.id);
    url = payment?.invoiceUrl;
    await db.subscription.update({
      where: { userId: user.id },
      data: { provider: "asaas", externalId: created.id, pendingPlan: plan, checkoutUrl: url ?? null, lastPaymentId: null },
    });
  } catch (e) {
    return fail(e);
  }
  if (!url) return { error: "A cobrança foi criada, mas o link não veio. Recarregue a página." };
  redirect(url);
}

/** Troca entre Pro e Premium numa assinatura já paga. Vale na hora; o novo valor entra na próxima cobrança. */
export async function changePlan(plan: PaidPlan, _state?: ActionState, _form?: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!paid(plan)) return { error: "Plano inválido." };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (!isPaying(sub) || !sub!.externalId) return { error: "Você não tem assinatura ativa." };
  if (sub!.plan === plan) return { ok: "Você já está nesse plano." };
  if (plan === "PRO" && (await db.group.count({ where: { ownerId: user.id } })) > PLANS.PRO.maxGroups)
    return { error: "Você organiza mais peladas do que o Pro permite. Apague ou passe uma delas antes." };
  try {
    await updateSubscriptionValue(sub!.externalId, PLANS[plan].priceCents, desc(plan));
  } catch (e) {
    return fail(e);
  }
  await db.subscription.update({ where: { userId: user.id }, data: { plan } });
  redirect(`/app/planos?mudou=${plan}`);
}

/** Para as cobranças. O plano segue valendo até o fim do período já pago. */
export async function cancelPlan(_state?: ActionState, _form?: FormData): Promise<ActionState> {
  const user = await requireUser();
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (!sub?.externalId) return { error: "Não há cobrança ativa." };
  try {
    await cancelSubscription(sub.externalId);
  } catch (e) {
    if (!(e instanceof AsaasError && e.status === 404)) return fail(e);
  }
  await db.subscription.update({ where: { userId: user.id }, data: { externalId: null, pendingPlan: null, checkoutUrl: null } });
  revalidatePath("/app/planos");
  return { ok: "Assinatura cancelada. Nada mais será cobrado." };
}
