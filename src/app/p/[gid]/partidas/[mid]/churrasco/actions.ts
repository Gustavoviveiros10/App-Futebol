"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/tenancy";
import { parseMoney } from "@/lib/format";
import { type ActionState } from "@/lib/actions";

// O churrasco é uma ajuda para a resenha: qualquer jogador da pelada pode mexer.

async function bbqOf(gid: string, mid: string) {
  await requireMember(gid);
  const bbq = await db.barbecue.findFirst({ where: { matchId: mid, match: { groupId: gid } } });
  if (!bbq) throw new Error("Churrasco não encontrado.");
  return bbq;
}

const path = (gid: string, mid: string) => `/p/${gid}/partidas/${mid}/churrasco`;

export async function startBbq(gid: string, mid: string) {
  await requireMember(gid);
  const match = await db.match.findFirst({
    where: { id: mid, groupId: gid },
    include: { players: { where: { OR: [{ played: true }, { status: "CONFIRMED" }] }, include: { player: true }, orderBy: { player: { name: "asc" } } } },
  });
  if (!match) throw new Error("Partida não encontrada.");
  const anyPlayed = match.players.some((p) => p.played);
  const list = match.players.filter((p) => (anyPlayed ? p.played : true));
  await db.barbecue.upsert({
    where: { matchId: mid },
    update: {},
    create: { matchId: mid, people: { create: list.map((p) => ({ name: p.player.nickname || p.player.name, playerId: p.playerId })) } },
  });
  revalidatePath(path(gid, mid));
}

export async function togglePerson(gid: string, mid: string, personId: string, field: "attending" | "drinks" | "paid") {
  const bbq = await bbqOf(gid, mid);
  if (!["attending", "drinks", "paid"].includes(field)) throw new Error("Campo inválido.");
  const p = await db.bbqPerson.findFirst({ where: { id: personId, bbqId: bbq.id } });
  if (!p) throw new Error("Pessoa não encontrada.");
  await db.bbqPerson.update({ where: { id: p.id }, data: { [field]: !p[field] } });
  revalidatePath(path(gid, mid));
}

export async function addGuest(gid: string, mid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const bbq = await bbqOf(gid, mid);
  const name = z.string().trim().min(2, "Escreva o nome do convidado.").max(40).safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  await db.bbqPerson.create({ data: { bbqId: bbq.id, name: name.data, guest: true } });
  revalidatePath(path(gid, mid));
  return { ok: `${name.data} entrou na conta.` };
}

export async function removeGuest(gid: string, mid: string, personId: string) {
  const bbq = await bbqOf(gid, mid);
  await db.bbqPerson.deleteMany({ where: { id: personId, bbqId: bbq.id, guest: true } });
  revalidatePath(path(gid, mid));
}

const itemSchema = z.object({
  description: z.string().trim().min(2, "O que foi comprado?").max(60),
  amount: z.string().min(1, "Informe o valor."),
  payerId: z.string().min(1, "Quem pagou?"),
});

export async function addItem(gid: string, mid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const bbq = await bbqOf(gid, mid);
  const parsed = itemSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const amountCents = parseMoney(parsed.data.amount);
  if (amountCents <= 0) return { error: "Valor inválido." };
  const payer = await db.bbqPerson.findFirst({ where: { id: parsed.data.payerId, bbqId: bbq.id } });
  if (!payer) return { error: "Quem pagou?" };
  await db.bbqItem.create({ data: { bbqId: bbq.id, description: parsed.data.description, amountCents, payerId: payer.id, drinksOnly: form.get("drinksOnly") === "on" } });
  revalidatePath(path(gid, mid));
  return { ok: "Gasto adicionado." };
}

export async function removeItem(gid: string, mid: string, itemId: string) {
  const bbq = await bbqOf(gid, mid);
  await db.bbqItem.deleteMany({ where: { id: itemId, bbqId: bbq.id } });
  revalidatePath(path(gid, mid));
}
