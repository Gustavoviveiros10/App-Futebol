import "server-only";
import { db } from "./db";

/** Administradores da pelada, sem contar o dono. */
export function adminCount(groupId: string, ownerId: string) {
  return db.player.count({ where: { groupId, role: "ORGANIZER", active: true, NOT: { userId: ownerId } } });
}
