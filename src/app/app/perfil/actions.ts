"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { AsaasError, billingEnabled, cancelSubscription, customerSubscriptions, deletePayment } from "@/lib/asaas";
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

/** LGPD: apaga a conta, as peladas que a pessoa organiza e para a cobrança no Asaas. */
export async function deleteAccount(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "EXCLUIR") return { error: "Digite EXCLUIR para confirmar." };
  const full = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!full || !(await verifyPassword(String(form.get("password") ?? ""), full.passwordHash))) return { error: "A senha não confere." };

  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (sub && billingEnabled() && (sub.externalId || sub.customerId)) {
    try {
      // todas as assinaturas do cliente, inclusive a de um teste grátis ainda não concluído
      const ids = new Set<string>(sub.externalId ? [sub.externalId] : []);
      if (sub.customerId) for (const s of await customerSubscriptions(sub.customerId)) ids.add(s.id);
      for (const id of ids) {
        await cancelSubscription(id).catch((e) => {
          if (!(e instanceof AsaasError && e.status === 404)) throw e;
        });
      }
    } catch (e) {
      console.error("asaas", e);
      return { error: "Não conseguimos cancelar sua assinatura agora. Tente de novo em alguns minutos." };
    }
    if (sub.upgradePaymentId) await deletePayment(sub.upgradePaymentId).catch(() => undefined);
  }

  await db.$transaction([
    // peladas que a pessoa organiza (apaga partidas, jogadores e financeiro junto)
    db.group.deleteMany({ where: { ownerId: user.id } }),
    db.joinRequest.deleteMany({ where: { userId: user.id } }),
    // nas peladas dos outros o nome continua na lista do organizador, sem foto e sem ligação com a conta
    db.player.updateMany({ where: { userId: user.id }, data: { photo: null, userId: null } }),
    db.user.delete({ where: { id: user.id } }),
  ]);
  await destroySession();
  redirect("/");
}
