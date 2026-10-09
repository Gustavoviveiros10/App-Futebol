import "server-only";
import { cache } from "react";
import { db } from "./db";
import { effectivePlan } from "./plans";

/**
 * O que do financeiro exige o plano Premium do dono da pelada.
 * "advanced": cobrança (mensalidades e avulsos) fica no Pro; caixa (despesas, saldo,
 * comprovantes) e divisão do churrasco são Premium. "all": o financeiro inteiro é Premium.
 */
export const FINANCE_PREMIUM: "advanced" | "all" = "all";

export const groupPremium = cache(async (groupId: string) => {
  const g = await db.group.findUnique({ where: { id: groupId }, select: { owner: { select: { subscription: true } } } });
  return effectivePlan(g?.owner.subscription) === "PREMIUM";
});

export async function requirePremium(groupId: string) {
  if (!(await groupPremium(groupId))) throw new Error("Este recurso é do plano Premium.");
}
