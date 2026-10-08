import { z } from "zod";
import { DEFAULT_TZ, minutesBetween, utcToZonedInput, zonedToUtc } from "./format";

export const matchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  location: z.string().trim().max(120).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário de término inválido."),
  format: z.enum(["TWO_TEAMS", "ROTATION"]).default("TWO_TEAMS"),
  access: z.enum(["RESTRICTED", "APPROVAL", "OPEN"]).default("RESTRICTED"),
  singleFee: z.string().optional(),
  maxPlayers: z.coerce.number().int().min(2).max(100).optional(),
  teamsCount: z.coerce.number().int().min(2).max(6).default(2),
  notes: z.string().trim().max(500).optional(),
}).transform((d) => ({ ...d, durationMin: minutesBetween(d.time, d.endTime) }))
  .refine((d) => d.durationMin >= 10 && d.durationMin <= 600, { message: "A partida precisa ter entre 10 minutos e 10 horas.", path: ["endTime"] });

/** Próxima ocorrência do dia/horário fixo da pelada. */
export function nextOccurrence(weekday: number | null, time: string | null, tz = DEFAULT_TZ) {
  const now = new Date();
  const today = utcToZonedInput(now, tz).date;
  const t = time ?? "20:00";
  for (let i = 0; i < 8; i++) {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    if (weekday != null && d.getUTCDay() !== weekday) continue;
    const at = zonedToUtc(ds, t, tz);
    if (at > now) return { date: ds, time: t };
  }
  return { date: today, time: t };
}

export const MATCH_STATUS_LABEL = {
  SCHEDULED: { label: "Confirmações abertas", tone: "green" },
  CLOSED: { label: "Lista fechada", tone: "amber" },
  DRAWN: { label: "Times sorteados", tone: "blue" },
  FINISHED: { label: "Encerrada", tone: "gray" },
  CANCELED: { label: "Cancelada", tone: "red" },
} as const;

/** O botão "Iniciar partida" libera esse tanto de minutos antes do horário. */
export const START_EARLY_MIN = 10;

export function canStart(date: Date, now = new Date()) {
  return now.getTime() >= date.getTime() - START_EARLY_MIN * 60_000;
}
