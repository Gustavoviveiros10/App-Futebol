"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { MAX_ADMINS, requireMember, requireOrganizer, requireOwner } from "@/lib/tenancy";
import { adminCount } from "@/lib/admins";
import { parseMoney } from "@/lib/format";
import { formObject, groupDuration, groupSchema, newInviteCode } from "@/lib/validation";
import { type ActionState, zodError } from "@/lib/actions";

export async function updateGroup(gid: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireOrganizer(gid);
  const parsed = groupSchema.safeParse(formObject(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const d = parsed.data;
  await db.group.update({
    where: { id: gid },
    data: {
      name: d.name,
      location: d.location ?? null,
      address: d.address ?? null,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      weekday: d.weekday ?? null,
      time: d.time ?? null,
      maxPlayers: d.maxPlayers ?? null,
      teamsCount: d.teamsCount,
      durationMin: groupDuration(d),
      format: d.format,
      access: d.access,
      modality: d.modality,
      level: d.level,
      monthlyFeeCents: parseMoney(d.monthlyFee),
      singleFeeCents: parseMoney(d.singleFee),
      paymentDueDay: d.paymentDueDay ?? 10,
    },
  });
  revalidatePath(`/p/${gid}`, "layout");
  return { ok: "Pelada atualizada." };
}

export async function regenerateInvite(gid: string) {
  await requireOrganizer(gid);
  await db.group.update({ where: { id: gid }, data: { inviteCode: newInviteCode() } });
  revalidatePath(`/p/${gid}`, "layout");
}

export async function newSeason(gid: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireOrganizer(gid);
  const name = z.string().trim().min(2, "Dê um nome para a temporada.").max(60).safeParse(form.get("name"));
  if (!name.success) return zodError(name.error.issues);
  const now = new Date();
  await db.$transaction([
    db.season.updateMany({ where: { groupId: gid, active: true }, data: { active: false, endsAt: now } }),
    db.season.create({ data: { groupId: gid, name: name.data, startsAt: now } }),
  ]);
  revalidatePath(`/p/${gid}`, "layout");
  return { ok: "Nova temporada iniciada! Os rankings da temporada começam do zero e o histórico continua salvo." };
}

export async function updateProfile(gid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await requireMember(gid);
  const name = z.string().trim().min(2, "Informe seu nome.").max(60).safeParse(form.get("name"));
  if (!name.success) return zodError(name.error.issues);
  await db.user.update({ where: { id: user.id }, data: { name: name.data } });
  revalidatePath(`/p/${gid}`, "layout");
  return { ok: "Nome atualizado." };
}

export async function leaveGroup(gid: string) {
  const { player, group, user } = await requireMember(gid);
  if (group.ownerId === user.id) throw new Error("O dono não pode sair da própria pelada.");
  await db.player.update({ where: { id: player.id }, data: { userId: null, role: "PLAYER" } });
  redirect("/app?todas=1");
}

export async function addAdmin(gid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { group } = await requireOwner(gid);
  const pid = String(form.get("playerId") ?? "");
  const target = await db.player.findFirst({ where: { id: pid, groupId: gid, active: true } });
  if (!target) return { error: "Escolha um jogador." };
  if (!target.userId) return { error: "Só quem já entrou com conta pode ser administrador." };
  if (target.role === "ORGANIZER") return { error: "Essa pessoa já é administradora." };
  if ((await adminCount(gid, group.ownerId)) >= MAX_ADMINS) return { error: `No máximo ${MAX_ADMINS} administradores além de você.` };
  await db.player.update({ where: { id: target.id }, data: { role: "ORGANIZER" } });
  revalidatePath(`/p/${gid}`, "layout");
  return { ok: `${target.nickname || target.name} agora é administrador.` };
}

export async function removeAdmin(gid: string, pid: string) {
  const { group } = await requireOwner(gid);
  const target = await db.player.findFirst({ where: { id: pid, groupId: gid } });
  if (!target || target.userId === group.ownerId) throw new Error("Não é possível tirar este administrador.");
  await db.player.update({ where: { id: target.id }, data: { role: "PLAYER" } });
  revalidatePath(`/p/${gid}`, "layout");
}
