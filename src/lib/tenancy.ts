import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "./db";
import { requireUser } from "./auth";

export type ViewMode = "organizador" | "jogador";
export const VIEW_COOKIE = "jc_modo";

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
  // dono ou administrador: os dois cuidam das partidas e do financeiro
  const canManage = player.role === "ORGANIZER";
  // quem organiza pode olhar o app como jogador (só muda a tela, não a permissão)
  const viewMode: ViewMode = canManage && (await cookies()).get(VIEW_COOKIE)?.value === "jogador" ? "jogador" : canManage ? "organizador" : "jogador";
  return {
    user,
    player,
    group: player.group,
    canManage,
    viewMode,
    isOrganizer: viewMode === "organizador",
    isOwner: player.group.ownerId === user.id,
  };
});

export async function requireMember(groupId: string) {
  return getMembership(groupId);
}

export async function requireOrganizer(groupId: string) {
  const m = await getMembership(groupId);
  if (!m.canManage) throw new Error("Apenas o organizador pode fazer isso.");
  return m;
}

/** Até 2 administradores além do dono. */
export const MAX_ADMINS = 2;

export async function requireOwner(groupId: string) {
  const m = await getMembership(groupId);
  if (!m.isOwner) throw new Error("Apenas o dono da pelada pode fazer isso.");
  return m;
}
