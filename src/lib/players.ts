import { z } from "zod";

export const playerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(60),
  nickname: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(30).optional(),
  photo: z
    .string()
    .max(250_000, "Foto muito grande.")
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Foto inválida.")
    .optional(),
  billingType: z.enum(["MONTHLY", "PER_MATCH"]),
  monthlyFee: z.string().optional(),
  position: z.enum(["GOALKEEPER", "DEFENDER", "FULLBACK", "MIDFIELDER", "FORWARD"]),
  skill: z.coerce.number().int().min(1).max(10).default(5),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  role: z.enum(["ORGANIZER", "PLAYER"]).optional(),
});
