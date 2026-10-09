import "server-only";
import { db } from "./db";

type NotifyInput = {
  groupId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
};

/**
 * Ponto único de notificação. Hoje grava no app; no futuro o mesmo ponto
 * pode disparar WhatsApp/push/e-mail conforme o tipo.
 */
export async function notifyPlayers(playerIds: string[], input: NotifyInput) {
  if (!playerIds.length) return;
  const players = await db.player.findMany({
    where: { id: { in: playerIds }, groupId: input.groupId, userId: { not: null } },
    select: { userId: true },
  });
  const data = players.map((p) => ({ ...input, userId: p.userId! }));
  if (data.length) await db.notification.createMany({ data });
}

export async function notifyGroup(groupId: string, input: Omit<NotifyInput, "groupId">, exceptUserId?: string) {
  const players = await db.player.findMany({
    where: { groupId, active: true, userId: { not: null, ...(exceptUserId ? { notIn: [exceptUserId] } : {}) } },
    select: { userId: true },
  });
  if (players.length)
    await db.notification.createMany({ data: players.map((p) => ({ ...input, groupId, userId: p.userId! })) });
}

/** Só para dono e administradores (ex.: pedido de vaga). */
export async function notifyGroupOrganizers(groupId: string, input: Omit<NotifyInput, "groupId">) {
  const players = await db.player.findMany({ where: { groupId, active: true, role: "ORGANIZER", userId: { not: null } }, select: { id: true } });
  await notifyPlayers(players.map((p) => p.id), { ...input, groupId });
}
