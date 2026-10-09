import "server-only";
import { db } from "./db";
import { PLANS, effectivePlan } from "./plans";

export async function getUserPlan(userId: string) {
  const [sub, owned] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    db.group.count({ where: { ownerId: userId } }),
  ]);
  const plan = effectivePlan(sub);
  return { sub, plan, owned, canCreate: owned < PLANS[plan].maxGroups };
}
