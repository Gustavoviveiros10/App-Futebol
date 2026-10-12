"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-admin";

/** Encerra todas as sessões de uma conta (ela precisa entrar de novo). */
export async function signOutUser(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === admin.id) return;
  await db.session.deleteMany({ where: { userId } });
  revalidatePath("/admin");
}
