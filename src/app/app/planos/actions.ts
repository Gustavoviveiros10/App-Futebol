"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { PlanCycle } from "@prisma/client";
import { PLANS, TRIAL_DAYS, cycleSuffix, planPrice, upgradeCostCents } from "@/lib/plans";
import type { ActionState } from "@/lib/actions";
import { AsaasError, billingEnabled, cancelSubscription, cleanCpfCnpj, createCustomer, lookupCep, updateCustomerAddress, createPayment, createSubscription, createTrialCheckout, deletePayment, firstOpenPayment, today, updateSubscriptionValue } from "@/lib/asaas";
import { canStartTrial, hasPendingCheckout, hasPendingUpgrade, isCardTrial, isPaying, trialAvailable } from "@/lib/billing";
import { money } from "@/lib/format";
import { appUrl } from "@/lib/mail";
import { cleanCep, cleanPhone } from "@/lib/br";

type PaidPlan = "PRO" | "PREMIUM";
const paid = (p: unknown): p is PaidPlan => p === "PRO" || p === "PREMIUM";
const cycleOk = (c: unknown): c is PlanCycle => c === "MONTHLY" || c === "YEARLY";
const desc = (p: PaidPlan, c: PlanCycle = "MONTHLY") => `Jogus Connect ${PLANS[p].name}${c === "YEARLY" ? " anual" : ""}`;

function fail(e: unknown): ActionState {
  console.error("asaas", e);
  return { error: e instanceof AsaasError && e.status === 400 ? `O pagamento recusou os dados: ${e.message}` : "Não deu para falar com o pagamento agora. Tente de novo em instantes." };
}

type Sub = Awaited<ReturnType<typeof db.subscription.findUnique>>;

/** Cliente no Asaas: na primeira vez cria com o CPF/CNPJ do formulário e guarda, para não pedir de novo. */
async function ensureCustomer(user: { id: string; name: string; email: string }, sub: Sub, form: FormData): Promise<string | ActionState> {
  if (sub?.customerId) return sub.customerId;
  const doc = cleanCpfCnpj(String(form.get("cpfCnpj") ?? ""));
  if (!doc) return { error: "Confira o CPF (ou CNPJ). Ele é exigido para emitir a cobrança." };
  const customerId = (await createCustomer({ name: user.name, email: user.email, cpfCnpj: doc, userId: user.id })).id;
  await db.subscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, plan: "FREE", status: "ACTIVE", provider: "asaas", customerId },
    update: { provider: "asaas", customerId },
  });
  return customerId;
}

/**
 * Teste grátis: leva para a página do Asaas onde a pessoa cadastra o cartão.
 * A assinatura nasce lá com a primeira cobrança daqui a TRIAL_DAYS dias; o plano libera quando o cartão é cadastrado.
 */
export async function startTrial(plan: PaidPlan, cycle: PlanCycle, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!paid(plan) || !cycleOk(cycle)) return { error: "Plano inválido." };
  if (!trialAvailable()) return { error: "O teste grátis ainda não está disponível." };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (!canStartTrial(sub)) return { error: "O teste grátis vale só para a primeira assinatura." };
  if (plan === "PRO" && (await db.group.count({ where: { ownerId: user.id } })) > PLANS.PRO.maxGroups)
    return { error: "Você organiza mais peladas do que o Pro permite. Escolha o Premium." };

  // o checkout do cartão exige celular e endereço no cadastro do cliente
  const cep = cleanCep(String(form.get("cep") ?? ""));
  if (!cep) return { error: "Confira o CEP." };
  const addressNumber = String(form.get("numero") ?? "").trim().slice(0, 20) || "S/N";
  const phone = cleanPhone(String(form.get("celular") ?? ""));
  if (!phone) return { error: "Confira o celular, com DDD." };
  let place: Awaited<ReturnType<typeof lookupCep>>;
  try {
    place = await lookupCep(cep);
  } catch {
    return { error: "Não deu para consultar o CEP agora. Tente de novo em instantes." };
  }
  if (!place) return { error: "Não encontramos esse CEP. Confira os números." };

  let url: string;
  try {
    const customer = await ensureCustomer(user, sub, form);
    if (typeof customer !== "string") return customer;
    await updateCustomerAddress(customer, { postalCode: cep, addressNumber, phone, ...place });
    const co = await createTrialCheckout({
      customer,
      valueCents: planPrice(plan, cycle),
      name: desc(plan, cycle),
      description: `${TRIAL_DAYS} dias grátis. Depois, ${money(planPrice(plan, cycle))}${cycleSuffix(cycle)}. Cancele quando quiser.`,
      firstChargeDate: today(TRIAL_DAYS),
      cycle,
      externalReference: `${user.id}:${plan}:teste`,
      returnUrl: appUrl("/app/planos"),
    });
    url = co.url;
    await db.subscription.update({ where: { userId: user.id }, data: { provider: "asaas", pendingPlan: plan, cycle, checkoutId: co.id, checkoutUrl: url } });
  } catch (e) {
    return fail(e);
  }
  redirect(url);
}

/** Cria a assinatura (mensal ou anual) no Asaas e leva para a fatura (Pix, cartão ou boleto). */
export async function subscribe(plan: PaidPlan, cycle: PlanCycle, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!paid(plan) || !cycleOk(cycle)) return { error: "Plano inválido." };
  if (!billingEnabled()) return { error: "A assinatura ainda não está disponível." };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (isPaying(sub)) return { error: "Você já tem uma assinatura ativa. Use a opção de mudar de plano." };
  if (isCardTrial(sub)) return { error: "Você está no teste grátis. A cobrança no cartão começa sozinha quando ele acabar." };
  if (plan === "PRO" && (await db.group.count({ where: { ownerId: user.id } })) > PLANS.PRO.maxGroups)
    return { error: "Você organiza mais peladas do que o Pro permite. Escolha o Premium." };

  let url: string | undefined;
  try {
    const customerId = await ensureCustomer(user, sub, form);
    if (typeof customerId !== "string") return customerId;
    // checkout anterior não pago: troca pelo novo
    if (hasPendingCheckout(sub) && sub!.externalId) await cancelSubscription(sub!.externalId).catch(() => undefined);

    const created = await createSubscription({ customer: customerId, valueCents: planPrice(plan, cycle), description: desc(plan, cycle), userId: user.id, plan, cycle });
    const payment = await firstOpenPayment(created.id);
    url = payment?.invoiceUrl;
    await db.subscription.update({
      where: { userId: user.id },
      data: { provider: "asaas", externalId: created.id, pendingPlan: plan, cycle, checkoutUrl: url ?? null, checkoutId: null, lastPaymentId: null },
    });
  } catch (e) {
    return fail(e);
  }
  if (!url) return { error: "A cobrança foi criada, mas o link não veio. Recarregue a página." };
  redirect(url);
}

/**
 * Troca entre Pro e Premium numa assinatura já paga.
 * Para cima: cobra a diferença (do mês, ou proporcional no anual) numa fatura avulsa e só libera depois do pagamento.
 * Para baixo: vale na hora e o valor menor entra na próxima cobrança.
 */
export async function changePlan(plan: PaidPlan, _state?: ActionState, _form?: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!paid(plan)) return { error: "Plano inválido." };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (isCardTrial(sub)) {
    // no teste só muda o plano e o valor da primeira cobrança
    if (sub!.plan === plan) return { ok: "Você já está nesse plano." };
    if (plan === "PRO" && (await db.group.count({ where: { ownerId: user.id } })) > PLANS.PRO.maxGroups)
      return { error: "Você organiza mais peladas do que o Pro permite. Apague ou passe uma delas antes." };
    try {
      await updateSubscriptionValue(sub!.externalId!, planPrice(plan, sub!.cycle), desc(plan, sub!.cycle));
    } catch (e) {
      return fail(e);
    }
    await db.subscription.update({ where: { userId: user.id }, data: { plan } });
    redirect(`/app/planos?mudou=${plan}`);
  }
  if (!isPaying(sub) || !sub!.externalId) return { error: "Você não tem assinatura ativa." };
  if (sub!.plan === plan) return { ok: "Você já está nesse plano." };
  if (plan === "PRO" && (await db.group.count({ where: { ownerId: user.id } })) > PLANS.PRO.maxGroups)
    return { error: "Você organiza mais peladas do que o Pro permite. Apague ou passe uma delas antes." };
  const diff = upgradeCostCents(sub!.plan, plan, sub!.cycle, sub!.currentPeriodEnd);
  if (diff > 0) {
    let url: string | undefined;
    try {
      if (sub!.upgradePaymentId) await deletePayment(sub!.upgradePaymentId).catch(() => undefined);
      const pay = await createPayment({ customer: sub!.customerId!, valueCents: diff, description: `Upgrade para o ${PLANS[plan].name}`, externalReference: `${user.id}:upgrade:${plan}` });
      url = pay.invoiceUrl;
      await db.subscription.update({ where: { userId: user.id }, data: { pendingPlan: plan, upgradePaymentId: pay.id, checkoutUrl: url ?? null } });
    } catch (e) {
      return fail(e);
    }
    if (!url) return { error: "A cobrança foi criada, mas o link não veio. Recarregue a página." };
    redirect(url);
  }
  try {
    if (sub!.upgradePaymentId) await deletePayment(sub!.upgradePaymentId).catch(() => undefined);
    await updateSubscriptionValue(sub!.externalId, planPrice(plan, sub!.cycle), desc(plan, sub!.cycle));
  } catch (e) {
    return fail(e);
  }
  await db.subscription.update({ where: { userId: user.id }, data: { plan, pendingPlan: null, upgradePaymentId: null, checkoutUrl: null } });
  redirect(`/app/planos?mudou=${plan}`);
}

/**
 * Troca entre cobrança mensal e anual, no mesmo plano.
 * Nada é cobrado na hora: o período já pago continua valendo e a próxima cobrança já vem no novo ciclo.
 */
export async function changeCycle(cycle: PlanCycle, _state?: ActionState, _form?: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!cycleOk(cycle)) return { error: "Opção inválida." };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (!(isPaying(sub) || isCardTrial(sub)) || !sub!.externalId || !paid(sub!.plan)) return { error: "Você não tem assinatura ativa." };
  if (sub!.cycle === cycle) return { ok: "Sua cobrança já está assim." };
  if (sub!.status === "PAST_DUE") return { error: "Pague a fatura em atraso antes de trocar a forma de cobrança." };
  if (hasPendingUpgrade(sub)) return { error: "Pague ou cancele a mudança de plano antes de trocar a forma de cobrança." };
  try {
    await updateSubscriptionValue(sub!.externalId, planPrice(sub!.plan, cycle), desc(sub!.plan, cycle), cycle);
  } catch (e) {
    return fail(e);
  }
  await db.subscription.update({ where: { userId: user.id }, data: { cycle } });
  redirect(`/app/planos?ciclo=${cycle === "YEARLY" ? "anual" : "mensal"}&trocou=1`);
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
  if (sub.upgradePaymentId) await deletePayment(sub.upgradePaymentId).catch(() => undefined);
  await db.subscription.update({ where: { userId: user.id }, data: { externalId: null, pendingPlan: null, checkoutUrl: null, upgradePaymentId: null } });
  revalidatePath("/app/planos");
  return { ok: "Assinatura cancelada. Nada mais será cobrado." };
}
