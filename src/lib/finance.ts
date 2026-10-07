import "server-only";
import type { Payment, Player } from "@prisma/client";
import { db } from "./db";
import { DEFAULT_TZ, monthKey, zonedToUtc } from "./format";

export type PaymentView = "PAID" | "PENDING" | "OVERDUE" | "CANCELED";

export function paymentView(p: Pick<Payment, "status" | "dueDate">, now = new Date()): PaymentView {
  if (p.status === "PAID") return "PAID";
  if (p.status === "CANCELED") return "CANCELED";
  return p.dueDate < startOfToday(now) ? "OVERDUE" : "PENDING";
}

function startOfToday(now: Date) {
  const d = new Date(now);
  d.setUTCHours(3, 0, 0, 0); // meia-noite em Brasília
  if (d > now) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

export function monthRange(key: string, tz = DEFAULT_TZ) {
  const [y, m] = key.split("-").map(Number);
  const start = zonedToUtc(`${y}-${String(m).padStart(2, "0")}-01`, "00:00", tz);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const end = zonedToUtc(`${ny}-${String(nm).padStart(2, "0")}-01`, "00:00", tz);
  return { start, end };
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Cria as mensalidades do mês para todos os mensalistas ativos (idempotente). */
export async function generateMonthlyCharges(groupId: string, key: string) {
  const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
  const players = await db.player.findMany({ where: { groupId, active: true, billingType: "MONTHLY" } });
  const [y, m] = key.split("-");
  const dueDate = zonedToUtc(`${y}-${m}-${String(group.paymentDueDay).padStart(2, "0")}`, "23:59", group.timezone);
  const data = players
    .map((p) => ({
      groupId,
      playerId: p.id,
      type: "MONTHLY" as const,
      reference: key,
      description: "Mensalidade",
      amountCents: p.monthlyFeeCents ?? group.monthlyFeeCents,
      dueDate,
    }))
    .filter((d) => d.amountCents > 0);
  const res = await db.payment.createMany({ data, skipDuplicates: true });
  return res.count;
}

/** Cobra o avulso de quem jogou a partida (idempotente). */
export async function chargeMatchPlayers(matchId: string) {
  const match = await db.match.findUniqueOrThrow({
    where: { id: matchId },
    include: { players: { where: { played: true }, include: { player: true } } },
  });
  if (match.singleFeeCents <= 0) return 0;
  const data = match.players
    .filter((mp) => mp.player.billingType === "PER_MATCH")
    .map((mp) => ({
      groupId: match.groupId,
      playerId: mp.playerId,
      matchId: match.id,
      type: "MATCH" as const,
      description: "Partida avulsa",
      amountCents: match.singleFeeCents,
      dueDate: match.date,
    }));
  const res = await db.payment.createMany({ data, skipDuplicates: true });
  return res.count;
}

export async function financeSummary(groupId: string, key: string, tz = DEFAULT_TZ) {
  const { start, end } = monthRange(key, tz);
  const now = new Date();
  const [monthPayments, overdueAll, paidRecent, monthlyPlayers, monthlyGenerated] = await Promise.all([
    db.payment.findMany({ where: { groupId, status: { not: "CANCELED" }, dueDate: { gte: start, lt: end } } }),
    db.payment.findMany({ where: { groupId, status: "PENDING", dueDate: { lt: startOfToday(now) } } }),
    db.payment.findMany({
      where: { groupId, status: "PAID", paidAt: { gte: monthRange(shiftMonth(key, -5), tz).start, lt: end } },
      select: { amountCents: true, paidAt: true },
    }),
    db.player.findMany({ where: { groupId, active: true, billingType: "MONTHLY" }, select: { id: true } }),
    db.payment.count({ where: { groupId, type: "MONTHLY", reference: key } }),
  ]);

  const sum = (list: { amountCents: number }[]) => list.reduce((s, p) => s + p.amountCents, 0);
  const expected = sum(monthPayments);
  const received = sum(monthPayments.filter((p) => p.status === "PAID"));
  const overdue = sum(overdueAll);
  const pending = sum(monthPayments.filter((p) => paymentView(p, now) === "PENDING"));

  const byMonth = new Map<string, number>();
  for (let i = 5; i >= 0; i--) byMonth.set(shiftMonth(key, -i), 0);
  for (const p of paidRecent) {
    const k = monthKey(p.paidAt!, tz);
    if (byMonth.has(k)) byMonth.set(k, byMonth.get(k)! + p.amountCents);
  }

  const lateIds = new Set(overdueAll.map((p) => p.playerId));
  const monthlyLate = monthlyPlayers.filter((p) => lateIds.has(p.id)).length;

  return {
    expected,
    received,
    pending,
    overdue,
    revenueByMonth: [...byMonth.entries()].map(([month, cents]) => ({ month, cents })),
    monthlyOk: monthlyPlayers.length - monthlyLate,
    monthlyLate,
    monthlyCount: monthlyPlayers.length,
    monthlyGenerated: monthlyGenerated > 0,
  };
}

/** Situação de um jogador: atrasado > pendente > em dia. */
export function playerFinanceStatus(payments: Pick<Payment, "status" | "dueDate">[]): PaymentView | "OK" {
  const views = payments.map((p) => paymentView(p));
  if (views.includes("OVERDUE")) return "OVERDUE";
  if (views.includes("PENDING")) return "PENDING";
  return "OK";
}

export type { Player };
