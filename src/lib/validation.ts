import { randomBytes } from "node:crypto";
import { z } from "zod";
import { minutesBetween } from "./format";

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
  address: z.string().trim().max(200).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  weekday: z.coerce.number().int().min(0).max(6).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido.").optional(),
  maxPlayers: z.coerce.number().int().min(2, "Limite mínimo: 2.").max(100).optional(),
  teamsCount: z.coerce.number().int().min(2).max(6).default(2),
  monthlyFee: z.string().optional(),
  singleFee: z.string().optional(),
  paymentDueDay: z.coerce.number().int().min(1).max(28).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário de término inválido.").optional(),
  format: z.enum(["TWO_TEAMS", "ROTATION"]).default("TWO_TEAMS"),
  access: z.enum(["RESTRICTED", "APPROVAL", "OPEN"]).default("RESTRICTED"),
  modality: z.enum(["SOCIETY", "FUTSAL", "FIELD"]).default("SOCIETY"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("INTERMEDIATE"),
});

/** Duração em minutos a partir de início/término do formulário da pelada. */
export function groupDuration(d: { time?: string; endTime?: string }) {
  return d.time && d.endTime ? minutesBetween(d.time, d.endTime) : undefined;
}
