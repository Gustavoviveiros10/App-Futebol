import "server-only";
import type { ExpenseCategory } from "@prisma/client";
import { db } from "./db";
import { DEFAULT_TZ } from "./format";
import { monthRange } from "./finance";

export const CATEGORIES: Record<ExpenseCategory, { label: string; color: string }> = {
  COURT: { label: "Quadra/aluguel", color: "bg-accent" },
  EQUIPMENT: { label: "Bola e material", color: "bg-sky-400" },
  FOOD: { label: "Comida", color: "bg-gold" },
  DRINK: { label: "Bebida", color: "bg-orange-400" },
  REFEREE: { label: "Juiz/goleiro", color: "bg-violet-400" },
  OTHER: { label: "Outros", color: "bg-fg/40" },
};

/** Despesas do mês: as lançadas no mês e as fixas (repetem todo mês) lançadas antes. */
export async function monthExpenses(groupId: string, key: string, tz = DEFAULT_TZ) {
  const { start, end } = monthRange(key, tz);
  const list = await db.expense.findMany({
    where: { groupId, OR: [{ date: { gte: start, lt: end } }, { recurring: true, date: { lt: start } }] },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { id: true, description: true, amountCents: true, category: true, date: true, recurring: true, receipt: true },
  });
  const total = list.reduce((s, e) => s + e.amountCents, 0);
  const byCategory = (Object.keys(CATEGORIES) as ExpenseCategory[])
    .map((c) => ({ category: c, cents: list.filter((e) => e.category === c).reduce((s, e) => s + e.amountCents, 0) }))
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents);
  return { list: list.map((e) => ({ ...e, carried: e.date < start })), total, byCategory };
}
