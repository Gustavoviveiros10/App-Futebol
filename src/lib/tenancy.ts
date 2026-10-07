import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "./db";
import { requireUser } from "./auth";

/**
 * Vínculo do usuário logado com uma pelada. Toda rota e ação dentro de
 * /p/[groupId] passa por aqui: sem vínculo ativo, a pelada "não existe" (404).
 */
export const getMembership = cache(async (groupId: string) => {
  const user = await requireUser();
  const player = await db.player.findFirst({
    where: { groupId, userId: user.id, active: true },
    include: { group: true },
  });
  if (!player) notFound();
  return {
    user,
    player,
    group: player.group,
    isOrganizer: player.role === "ORGANIZER",
  };
});

export async function requireMember(groupId: string) {
  return getMembership(groupId);
}

export async function requireOrganizer(groupId: string) {
  const m = await getMembership(groupId);
  if (!m.isOrganizer) throw new Error("Apenas o organizador pode fazer isso.");
  return m;
}
