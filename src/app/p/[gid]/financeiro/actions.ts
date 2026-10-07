"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/tenancy";
import { generateMonthlyCharges } from "@/lib/finance";
import { parseMoney, zonedToUtc } from "@/lib/format";
import { notifyPlayers } from "@/lib/notify";
import { formObject } from "@/lib/validation";
import { type ActionState, zodError } from "@/lib/actions";

const monthKeyRe = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function generateCharges(gid: string, key: string) {
  await requireOrganizer(gid);
  if (!monthKeyRe.test(key)) throw new Error("Mês inválido.");
  const count = await generateMonthlyCharges(gid, key);
  if (count) {
    const created = await db.payment.findMany({ where: { groupId: gid, type: "MONTHLY", reference: key, status: "PENDING" }, select: { playerId: true } });
    await notifyPlayers(created.map((p) => p.playerId), { groupId: gid, type: "PAYMENT_DUE", title: "💰 Sua mensalidade do mês está disponível", link: `/p/${gid}/financeiro` });
  }
  revalidatePath(`/p/${gid}`, "layout");
}

async function getPayment(gid: string, id: string) {
  const p = await db.payment.findFirst({ where: { id, groupId: gid } });
  if (!p) throw new Error("Cobrança não encontrada.");
  return p;
}

export async function markPaid(gid: string, id: string, form: FormData) {
  await requireOrganizer(gid);
  await getPayment(gid, id);
  const method = z.enum(["PIX", "CASH", "CARD", "TRANSFER", "OTHER"]).catch("PIX").parse(form.get("method"));
  await db.payment.update({ where: { id }, data: { status: "PAID", paidAt: new Date(), method } });
  revalidatePath(`/p/${gid}`, "layout");
}

export async function markPending(gid: string, id: string) {
  await requireOrganizer(gid);
  await getPayment(gid, id);
  await db.payment.update({ where: { id }, data: { status: "PENDING", paidAt: null, method: null } });
  revalidatePath(`/p/${gid}`, "layout");
}

export async function cancelPayment(gid: string, id: string) {
  await requireOrganizer(gid);
  await getPayment(gid, id);
  await db.payment.update({ where: { id }, data: { status: "CANCELED" } });
  revalidatePath(`/p/${gid}`, "layout");
}

export async function remindPayment(gid: string, id: string) {
  await requireOrganizer(gid);
  const p = await getPayment(gid, id);
  await notifyPlayers([p.playerId], { groupId: gid, type: "PAYMENT_REMINDER", title: "💰 Você tem um pagamento pendente na pelada", link: `/p/${gid}/financeiro` });
  revalidatePath(`/p/${gid}`, "layout");
}

const chargeSchema = z.object({
  playerId: z.string().min(1, "Escolha o jogador."),
  amount: z.string().min(1, "Informe o valor."),
  description: z.string().trim().min(2, "Descreva a cobrança.").max(80),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  paid: z.string().optional(),
});

export async function createCharge(gid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { group } = await requireOrganizer(gid);
  const parsed = chargeSchema.safeParse(formObject(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const d = parsed.data;
  const player = await db.player.findFirst({ where: { id: d.playerId, groupId: gid } });
  if (!player) return { error: "Jogador não encontrado." };
  const amountCents = parseMoney(d.amount);
  if (amountCents <= 0) return { error: "Valor inválido." };
  const paid = d.paid === "on";
  await db.payment.create({
    data: {
      groupId: gid,
      playerId: player.id,
      type: "OTHER",
      description: d.description,
      amountCents,
      dueDate: zonedToUtc(d.dueDate, "23:59", group.timezone),
      status: paid ? "PAID" : "PENDING",
      paidAt: paid ? new Date() : null,
      method: paid ? "PIX" : null,
    },
  });
  revalidatePath(`/p/${gid}`, "layout");
  return { ok: paid ? "Pagamento registrado." : "Cobrança criada." };
}
