"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { type ActionState, zodError } from "@/lib/actions";

export async function saveName(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = z.string().trim().min(2, "Informe seu nome.").max(60).safeParse(form.get("name"));
  if (!name.success) return zodError(name.error.issues);
  await db.user.update({ where: { id: user.id }, data: { name: name.data } });
  revalidatePath("/", "layout");
  return { ok: "Nome atualizado." };
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z
    .object({ current: z.string().min(1, "Informe a senha atual."), password: z.string().min(8, "A nova senha precisa de pelo menos 8 caracteres.").max(100) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const full = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!full || !(await verifyPassword(parsed.data.current, full.passwordHash))) return { error: "A senha atual não confere." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return { ok: "Senha trocada." };
}
