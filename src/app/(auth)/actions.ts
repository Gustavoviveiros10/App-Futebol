"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, hashToken, newToken, verifyPassword } from "@/lib/auth";
import { appUrl, sendMail } from "@/lib/mail";
import { type ActionState, APP_NAME, zodError } from "@/lib/actions";

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/app";
}

const email = z.string().trim().toLowerCase().email("E-mail inválido.");
const password = z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(100);

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z
    .object({ name: z.string().trim().min(2, "Informe seu nome.").max(60), email, password })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "Já existe uma conta com esse e-mail. Faça login." };
  const user = await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password) },
  });
  await createSession(user.id);
  const next = String(form.get("next") ?? "");
  if (!next && form.get("perfil") === "organizador") redirect("/app/planos?novo=1");
  redirect(safeNext(form.get("next")));
}

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ email, password: z.string().min(1, "Informe a senha.") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash)))
    return { error: "E-mail ou senha incorretos." };
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}

export async function requestPasswordReset(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "E-mail inválido." };
  const user = await db.user.findUnique({ where: { email: parsed.data } });
  const generic = { ok: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora." };
  if (!user) return generic;
  const token = newToken();
  await db.passwordResetToken.create({
    data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
  });
  const link = appUrl(`/redefinir-senha/${token}`);
  await sendMail(
    user.email,
    `${APP_NAME}: redefinir sua senha`,
    `Olá, ${user.name}!\n\nPara criar uma nova senha, acesse:\n${link}\n\nO link vale por 1 hora. Se você não pediu, ignore este e-mail.`,
  );
  return generic;
}

export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z
    .object({ token: z.string().min(10), password, confirm: z.string() })
    .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const record = await db.passwordResetToken.findUnique({ where: { id: hashToken(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date())
    return { error: "Este link expirou ou já foi usado. Peça um novo." };
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await createSession(record.userId);
  redirect("/app");
}
