import "server-only";
import { db } from "./db";
import { PLANS, effectivePlan } from "./plans";
import { billingEnabled } from "./asaas";
import { syncFromAsaas } from "./billing";

export async function getUserPlan(userId: string) {
  let [sub, owned] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    db.group.count({ where: { ownerId: userId } }),
  ]);
  // sem webhook, confere no Asaas se a mensalidade/fatura em aberto já foi paga
  if (billingEnabled() && (await syncFromAsaas(sub))) sub = await db.subscription.findUnique({ where: { userId } });
  const plan = effectivePlan(sub);
  return { sub, plan, owned, canCreate: owned < PLANS[plan].maxGroups };
}
