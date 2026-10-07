"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseMoney } from "@/lib/format";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { type ActionState, zodError } from "@/lib/actions";
import { formObject, groupSchema, newInviteCode } from "@/lib/validation";

export async function createGroup(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { plan, canCreate } = await getUserPlan(user.id);
  if (!canCreate)
    return { error: plan === "FREE" ? "Criar uma pelada é um recurso do plano Pro." : `Seu plano ${PLANS[plan].name} permite até ${PLANS[plan].maxGroups} pelada(s).` };
  const parsed = groupSchema.safeParse(formObject(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const d = parsed.data;
  const now = new Date();
  const group = await db.group.create({
    data: {
      name: d.name,
      location: d.location,
      weekday: d.weekday,
      time: d.time ?? null,
      maxPlayers: d.maxPlayers,
      teamsCount: d.teamsCount,
      monthlyFeeCents: parseMoney(d.monthlyFee),
      singleFeeCents: parseMoney(d.singleFee),
      inviteCode: newInviteCode(),
      ownerId: user.id,
      players: { create: { userId: user.id, role: "ORGANIZER", name: user.name, billingType: "MONTHLY" } },
      seasons: {
        create: { name: `Temporada ${now.getFullYear()} — ${now.getMonth() < 6 ? "1º" : "2º"} semestre`, startsAt: now },
      },
    },
  });
  redirect(`/p/${group.id}`);
}

/** Ativa o teste grátis do plano (sem cobrança por enquanto; o checkout entra aqui depois). */
export async function startTrial(plan: "PRO" | "PREMIUM") {
  const user = await requireUser();
  if (plan !== "PRO" && plan !== "PREMIUM") throw new Error("Plano inválido.");
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  const end = new Date(Date.now() + TRIAL_DAYS * 86400_000);
  if (sub?.currentPeriodEnd && sub.currentPeriodEnd > new Date()) {
    // já está em um período ativo: só troca o plano, mantendo a data
    await db.subscription.update({ where: { userId: user.id }, data: { plan } });
  } else if (sub?.currentPeriodEnd) {
    throw new Error("Seu período de teste já terminou. A assinatura com pagamento chega em breve.");
  } else {
    await db.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, plan, status: "TRIALING", currentPeriodEnd: end },
      update: { plan, status: "TRIALING", currentPeriodEnd: end },
    });
  }
  redirect("/app/nova");
}

/** Aceita o link completo do convite ou só o código. */
export async function openInvite(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const raw = String(form.get("code") ?? "").trim();
  const code = raw.split("/convite/").pop()?.split(/[?#\s]/)[0] ?? "";
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(code)) return { error: "Cole o link de convite que o organizador te mandou." };
  const group = await db.group.findUnique({ where: { inviteCode: code }, select: { id: true } });
  if (!group) return { error: "Convite não encontrado. Confira o link com o organizador." };
  redirect(`/convite/${code}`);
}
