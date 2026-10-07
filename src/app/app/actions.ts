"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseMoney } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/plans";
import { type ActionState, zodError } from "@/lib/actions";
import { formObject, groupSchema, newInviteCode } from "@/lib/validation";

export async function createGroup(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
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
      subscription: {
        create: { plan: "PRO", status: "TRIALING", currentPeriodEnd: new Date(now.getTime() + TRIAL_DAYS * 86400_000) },
      },
      players: { create: { userId: user.id, role: "ORGANIZER", name: user.name, billingType: "MONTHLY" } },
      seasons: {
        create: { name: `Temporada ${now.getFullYear()} — ${now.getMonth() < 6 ? "1º" : "2º"} semestre`, startsAt: now },
      },
    },
  });
  redirect(`/p/${group.id}`);
}
