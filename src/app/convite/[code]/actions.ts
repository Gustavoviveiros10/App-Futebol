"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { playerLimit } from "@/lib/plans";
import { notifyPlayers } from "@/lib/notify";

/** Entra na pelada: reivindicando um cadastro existente (playerId) ou como novo jogador. */
export async function joinGroup(code: string, playerId: string | null) {
  const user = await requireUser();
  const group = await db.group.findUnique({ where: { inviteCode: code }, include: { subscription: true } });
  if (!group) throw new Error("Convite inválido ou expirado.");

  const existing = await db.player.findFirst({ where: { groupId: group.id, userId: user.id } });
  if (existing) {
    if (!existing.active) await db.player.update({ where: { id: existing.id }, data: { active: true } });
    redirect(`/p/${group.id}`);
  }

  let player;
  if (playerId) {
    const claimed = await db.player.updateMany({ where: { id: playerId, groupId: group.id, userId: null, active: true }, data: { userId: user.id } });
    if (claimed.count === 0) throw new Error("Esse cadastro já foi vinculado a outra conta. Escolha outro ou entre como novo.");
    player = await db.player.findUniqueOrThrow({ where: { id: playerId } });
  } else {
    const limit = playerLimit(group.subscription);
    if (limit != null && (await db.player.count({ where: { groupId: group.id, active: true } })) >= limit)
      throw new Error("Esta pelada atingiu o limite de jogadores do plano. Avise o organizador.");
    player = await db.player.create({ data: { groupId: group.id, userId: user.id, name: user.name } });
    const open = await db.match.findMany({ where: { groupId: group.id, status: { in: ["SCHEDULED", "CLOSED"] } }, select: { id: true } });
    if (open.length) await db.matchPlayer.createMany({ data: open.map((m) => ({ matchId: m.id, playerId: player!.id })), skipDuplicates: true });
  }

  const organizers = await db.player.findMany({ where: { groupId: group.id, role: "ORGANIZER" }, select: { id: true } });
  await notifyPlayers(organizers.map((o) => o.id), {
    groupId: group.id,
    type: "PLAYER_JOINED",
    title: `👋 ${user.name} entrou na pelada`,
    body: playerId ? `Vinculou a conta ao cadastro "${player.name}".` : "Complete posição e tipo de pagamento no cadastro dele.",
    link: `/p/${group.id}/jogadores/${player.id}`,
  });
  redirect(`/p/${group.id}`);
}
