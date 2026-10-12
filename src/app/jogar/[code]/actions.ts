"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { setAttendance } from "@/lib/attendance";
import { findOrCreateUserPlayer, rememberPlayer } from "@/lib/guest";
import { notifyGroupOrganizers } from "@/lib/notify";
import { type ActionState } from "@/lib/actions";

const phone = z.string().trim().min(8, "Coloque seu WhatsApp para o organizador te responder.").max(30);

/** Entrar ou pedir vaga pela busca "Quero jogar": só com conta, para o organizador ver o histórico de avaliações. */
export async function requestSpot(code: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/jogar/${code}`)}`);
  const match = await db.match.findUnique({ where: { shareCode: code } });
  if (!match || match.status === "CANCELED" || match.access === "RESTRICTED") return { error: "Partida não encontrada." };
  if (match.status !== "SCHEDULED") return { error: "A lista desta partida já foi fechada." };
  const p = phone.safeParse(form.get("phone"));
  if (!p.success) return { error: p.error.issues[0].message };

  if (match.access === "APPROVAL") {
    // quem já é da pelada (conta ligada) não precisa pedir
    const member = await db.player.findUnique({ where: { groupId_userId: { groupId: match.groupId, userId: user.id } }, select: { active: true } });
    if (!member?.active) {
      const pending = await db.joinRequest.findFirst({ where: { matchId: match.id, userId: user.id, status: "PENDING" } });
      if (!pending) {
        await db.joinRequest.create({ data: { matchId: match.id, userId: user.id, name: user.name, phone: p.data } });
        await notifyGroupOrganizers(match.groupId, { type: "JOIN_REQUEST", title: `🙋 ${user.name} pediu vaga na partida`, link: `/p/${match.groupId}/partidas/${match.id}` });
      }
      revalidatePath(`/p/${match.groupId}`, "layout");
      redirect(`/jogar/${code}?feito=pedido&nome=${encodeURIComponent(user.name.split(" ")[0])}`);
    }
  }

  const playerId = await findOrCreateUserPlayer(match.groupId, user, p.data);
  await setAttendance(match.id, playerId, "CONFIRMED");
  await rememberPlayer(match.groupId, playerId);
  revalidatePath(`/p/${match.groupId}`, "layout");
  redirect(`/jogar/${code}?feito=entrou`);
}
