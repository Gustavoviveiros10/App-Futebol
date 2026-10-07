"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/tenancy";
import { parseMoney, zonedToUtc } from "@/lib/format";
import { playerLimit } from "@/lib/plans";
import { playerSchema } from "@/lib/players";
import { formObject } from "@/lib/validation";
import { type ActionState, zodError } from "@/lib/actions";

function toData(d: ReturnType<typeof playerSchema.parse>, tz: string) {
  return {
    name: d.name,
    nickname: d.nickname ?? null,
    phone: d.phone ?? null,
    photo: d.photo ?? null,
    billingType: d.billingType,
    monthlyFeeCents: d.billingType === "MONTHLY" && d.monthlyFee ? parseMoney(d.monthlyFee) : null,
    position: d.position,
    skill: d.skill,
    ...(d.joinedAt ? { joinedAt: zonedToUtc(d.joinedAt, "12:00", tz) } : {}),
  };
}

export async function createPlayer(gid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { group } = await requireOrganizer(gid);
  const parsed = playerSchema.safeParse(formObject(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const limit = playerLimit(group.subscription);
  if (limit != null) {
    const count = await db.player.count({ where: { groupId: gid, active: true } });
    if (count >= limit) return { error: `O plano gratuito permite até ${limit} jogadores. Ative o Pro em Ajustes para cadastrar mais.` };
  }
  const player = await db.player.create({ data: { groupId: gid, ...toData(parsed.data, group.timezone) } });
  // entra como pendente nas partidas abertas
  const open = await db.match.findMany({ where: { groupId: gid, status: { in: ["SCHEDULED", "CLOSED"] } }, select: { id: true } });
  if (open.length) await db.matchPlayer.createMany({ data: open.map((m) => ({ matchId: m.id, playerId: player.id })), skipDuplicates: true });
  revalidatePath(`/p/${gid}`, "layout");
  if (form.get("another") === "1") return { ok: `${player.name} cadastrado! Pode cadastrar o próximo.` };
  redirect(`/p/${gid}/jogadores`);
}

export async function updatePlayer(gid: string, pid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { group, player: me } = await requireOrganizer(gid);
  const parsed = playerSchema.safeParse(formObject(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const target = await db.player.findFirst({ where: { id: pid, groupId: gid } });
  if (!target) return { error: "Jogador não encontrado." };
  const role = parsed.data.role ?? target.role;
  if (target.id === me.id && role !== "ORGANIZER") return { error: "Você não pode tirar seu próprio acesso de organizador." };
  if (role === "ORGANIZER" && !target.userId) return { error: "Só quem já entrou com conta pode ser organizador." };
  await db.player.update({ where: { id: pid }, data: { ...toData(parsed.data, group.timezone), role } });
  revalidatePath(`/p/${gid}`, "layout");
  redirect(`/p/${gid}/jogadores/${pid}`);
}

export async function removePlayer(gid: string, pid: string) {
  const { player: me, group } = await requireOrganizer(gid);
  if (pid === me.id) throw new Error("Você não pode remover a si mesmo.");
  const target = await db.player.findFirst({ where: { id: pid, groupId: gid } });
  if (!target) throw new Error("Jogador não encontrado.");
  if (target.userId === group.ownerId) throw new Error("O dono da pelada não pode ser removido.");
  // mantém o histórico: só desativa e tira das partidas ainda não jogadas
  await db.$transaction([
    db.player.update({ where: { id: pid }, data: { active: false, role: "PLAYER" } }),
    db.matchPlayer.deleteMany({ where: { playerId: pid, match: { status: { in: ["SCHEDULED", "CLOSED", "DRAWN"] } } } }),
  ]);
  revalidatePath(`/p/${gid}`, "layout");
  redirect(`/p/${gid}/jogadores`);
}

export async function reactivatePlayer(gid: string, pid: string) {
  await requireOrganizer(gid);
  await db.player.updateMany({ where: { id: pid, groupId: gid }, data: { active: true } });
  revalidatePath(`/p/${gid}`, "layout");
}

export async function unlinkAccount(gid: string, pid: string) {
  const { player: me, group } = await requireOrganizer(gid);
  const target = await db.player.findFirst({ where: { id: pid, groupId: gid } });
  if (!target || target.id === me.id || target.userId === group.ownerId) throw new Error("Não é possível desvincular este jogador.");
  await db.player.update({ where: { id: pid }, data: { userId: null, role: "PLAYER" } });
  revalidatePath(`/p/${gid}`, "layout");
}
