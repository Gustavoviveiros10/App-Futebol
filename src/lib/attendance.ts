import "server-only";
import type { Attendance, Prisma } from "@prisma/client";
import { db } from "./db";
import { notifyPlayers } from "./notify";

type Tx = Prisma.TransactionClient;

/**
 * Muda a presença de um jogador respeitando o limite da partida:
 * - quem confirma com a lista cheia vai para a lista de espera;
 * - quando um confirmado sai, o primeiro da espera sobe automaticamente.
 * Retorna o status final gravado.
 */
export async function setAttendance(matchId: string, playerId: string, wanted: Attendance) {
  const promoted: string[] = [];
  const result = await db.$transaction(async (tx) => {
    // trava a partida para evitar duas pessoas pegando a última vaga
    await tx.$executeRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    const current = await tx.matchPlayer.findUnique({ where: { matchId_playerId: { matchId, playerId } } });
    const wasConfirmed = current?.status === "CONFIRMED";

    let status: Attendance = wanted;
    if (wanted === "CONFIRMED" && !wasConfirmed && match.maxPlayers) {
      const confirmed = await tx.matchPlayer.count({ where: { matchId, status: "CONFIRMED" } });
      if (confirmed >= match.maxPlayers) status = "WAITLIST";
    }
    if (wanted === "WAITLIST") status = "WAITLIST";

    const keepQueue = current?.status === status && current.queuedAt;
    const data = {
      status,
      respondedAt: new Date(),
      queuedAt: status === "CONFIRMED" || status === "WAITLIST" ? (keepQueue ? current!.queuedAt : new Date()) : null,
      ...(status !== "CONFIRMED" ? { teamId: null } : {}),
    };
    await tx.matchPlayer.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      create: { matchId, playerId, ...data },
      update: data,
    });

    if (wasConfirmed && status !== "CONFIRMED") await fillOpenSpots(tx, matchId, match.maxPlayers, promoted);
    return status;
  });
  if (promoted.length) {
    const match = await db.match.findUnique({ where: { id: matchId }, select: { groupId: true } });
    if (match)
      await notifyPlayers(promoted, {
        groupId: match.groupId,
        type: "WAITLIST_PROMOTED",
        title: "🎉 Abriu vaga! Você saiu da lista de espera",
        body: "Sua presença foi confirmada na próxima pelada.",
        link: `/p/${match.groupId}/partidas/${matchId}`,
      });
  }
  return result;
}

/** Sobe jogadores da lista de espera enquanto houver vaga. */
export async function fillOpenSpots(tx: Tx, matchId: string, maxPlayers: number | null, promoted: string[] = []) {
  const confirmed = await tx.matchPlayer.count({ where: { matchId, status: "CONFIRMED" } });
  const open = maxPlayers ? maxPlayers - confirmed : Infinity;
  if (open <= 0) return promoted;
  const queue = await tx.matchPlayer.findMany({
    where: { matchId, status: "WAITLIST" },
    orderBy: { queuedAt: "asc" },
    take: Number.isFinite(open) ? open : undefined,
  });
  for (const mp of queue) {
    await tx.matchPlayer.update({ where: { id: mp.id }, data: { status: "CONFIRMED" } });
    promoted.push(mp.playerId);
  }
  return promoted;
}

export const ATTENDANCE_LABEL: Record<Attendance, string> = {
  CONFIRMED: "Confirmado",
  WAITLIST: "Lista de espera",
  MAYBE: "Ainda não sei",
  DECLINED: "Não vai",
  PENDING: "Pendente",
};
