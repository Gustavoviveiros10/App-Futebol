import { randomBytes } from "node:crypto";
import { z } from "zod";

export function newInviteCode() {
  return randomBytes(6).toString("base64url");
}

/** Remove campos vazios para que `optional()` funcione com inputs em branco. */
export function formObject(form: FormData) {
  return Object.fromEntries([...form.entries()].filter(([, v]) => v !== ""));
}

export const groupSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome para a pelada.").max(60),
  location: z.string().trim().max(120).optional(),
  weekday: z.coerce.number().int().min(0).max(6).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido.").optional(),
  maxPlayers: z.coerce.number().int().min(2, "Limite mínimo: 2.").max(100).optional(),
  teamsCount: z.coerce.number().int().min(2).max(6).default(2),
  monthlyFee: z.string().optional(),
  singleFee: z.string().optional(),
  paymentDueDay: z.coerce.number().int().min(1).max(28).optional(),
});
