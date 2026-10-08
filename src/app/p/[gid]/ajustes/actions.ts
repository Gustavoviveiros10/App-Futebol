"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMember, requireOrganizer } from "@/lib/tenancy";
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
