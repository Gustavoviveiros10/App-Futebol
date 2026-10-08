"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { setAttendance } from "@/lib/attendance";
import { findOrCreateGuestPlayer, forgetPlayer, rememberPlayer } from "@/lib/guest";
import { notifyGroupOrganizers } from "@/lib/notify";
import { type ActionState } from "@/lib/actions";

async function openMatch(code: string) {
  const match = await db.match.findUnique({ where: { shareCode: code } });
  if (!match) throw new Error("Partida não encontrada.");
  return match;
}

const status = z.enum(["CONFIRMED", "DECLINED"]);
const newcomer = z.object({
  name: z.string().trim().min(2, "Escreva seu nome.").max(60),
  phone: z.string().trim().max(30).optional(),
});

/** Confirmação pelo link, sem conta: escolhe o nome na lista ou entra como novo. */
export async function guestRespond(code: string, _: ActionState, form: FormData): Promise<ActionState> {
  const match = await openMatch(code);
  if (match.status !== "SCHEDULED") return { error: "A lista desta partida já foi fechada. Fale com o organizador." };
  const s = status.safeParse(form.get("status"));
  if (!s.success) return { error: "Escolha Vou ou Não vou." };

  let playerId = String(form.get("playerId") ?? "");
  if (playerId) {
    const p = await db.player.findFirst({ where: { id: playerId, groupId: match.groupId, active: true } });
    if (!p) return { error: "Escolha seu nome na lista." };
  } else {
    const n = newcomer.safeParse({ name: form.get("name"), phone: form.get("phone") || undefined });
    if (!n.success) return { error: n.error.issues[0].message };
    if (s.data === "DECLINED") return { error: "Se não for jogar, não precisa fazer nada. 😉" };
    if (match.access === "APPROVAL") {
      await db.joinRequest.create({ data: { matchId: match.id, name: n.data.name, phone: n.data.phone } });
      await notifyGroupOrganizers(match.groupId, { type: "JOIN_REQUEST", title: `🙋 ${n.data.name} pediu vaga na partida`, link: `/p/${match.groupId}/partidas/${match.id}` });
      redirect(`/j/${code}?pedido=1`);
    }
    playerId = await findOrCreateGuestPlayer(match.groupId, n.data.name, n.data.phone);
  }
  await setAttendance(match.id, playerId, s.data);
  await rememberPlayer(match.groupId, playerId);
  revalidatePath(`/p/${match.groupId}`, "layout");
  redirect(`/j/${code}?ok=${s.data === "CONFIRMED" ? "vou" : "nao"}`);
}

export async function guestForget(code: string) {
  const match = await openMatch(code);
  await forgetPlayer(match.groupId);
  redirect(`/j/${code}`);
}
