import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { newInviteCode } from "./validation";

/** Garante o código do link público da partida (partidas antigas não tinham). */
export async function ensureShareCode<T extends { id: string; shareCode: string | null }>(m: T): Promise<T & { shareCode: string }> {
  if (m.shareCode) return m as T & { shareCode: string };
  const shareCode = newInviteCode();
  await db.match.updateMany({ where: { id: m.id, shareCode: null }, data: { shareCode } });
  const fresh = await db.match.findUnique({ where: { id: m.id }, select: { shareCode: true } });
  return { ...m, shareCode: fresh?.shareCode ?? shareCode };
}

/** Quem confirmou pelo link fica lembrado neste aparelho (um cookie por pelada). */
const cookieName = (groupId: string) => `jc_${groupId}`;

export async function rememberedPlayer(groupId: string) {
  return (await cookies()).get(cookieName(groupId))?.value ?? null;
}

export async function rememberPlayer(groupId: string, playerId: string) {
  (await cookies()).set(cookieName(groupId), playerId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
}

export async function forgetPlayer(groupId: string) {
  (await cookies()).delete(cookieName(groupId));
}

/** Quem chega pelo link ou pela busca: reaproveita o jogador com o mesmo WhatsApp, senão cria. */
export async function findOrCreateGuestPlayer(groupId: string, name: string, phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length >= 8) {
    const same = await db.player.findMany({ where: { groupId, phone: { not: null } }, select: { id: true, phone: true, active: true } });
    const hit = same.find((p) => p.phone!.replace(/\D/g, "").endsWith(digits.slice(-8)));
    if (hit) {
      if (!hit.active) await db.player.update({ where: { id: hit.id }, data: { active: true } });
      return hit.id;
    }
  }
  const p = await db.player.create({ data: { groupId, name, phone: phone || null, billingType: "PER_MATCH" } });
  return p.id;
}

/** Jogador de uma conta dentro da pelada: o já ligado à conta, senão o do mesmo WhatsApp (que passa a ser dela), senão um novo. */
export async function findOrCreateUserPlayer(groupId: string, user: { id: string; name: string }, phone?: string | null) {
  const linked = await db.player.findUnique({ where: { groupId_userId: { groupId, userId: user.id } }, select: { id: true, active: true } });
  if (linked) {
    if (!linked.active) await db.player.update({ where: { id: linked.id }, data: { active: true } });
    return linked.id;
  }
  const id = await findOrCreateGuestPlayer(groupId, user.name, phone);
  await db.player.updateMany({ where: { id, userId: null }, data: { userId: user.id } });
  return id;
}

/** Último WhatsApp que a conta usou em alguma pelada (para já vir preenchido). */
export async function lastPhoneOf(userId: string) {
  const p = await db.player.findFirst({ where: { userId, phone: { not: null } }, orderBy: { updatedAt: "desc" }, select: { phone: true } });
  return p?.phone ?? "";
}
