"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { VIEW_COOKIE, type ViewMode, requireOrganizer } from "@/lib/tenancy";

/** Troca a tela entre "organizador" e "jogador" para quem organiza. */
export async function setViewMode(gid: string, mode: ViewMode) {
  await requireOrganizer(gid);
  (await cookies()).set(VIEW_COOKIE, mode === "jogador" ? "jogador" : "organizador", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  revalidatePath(`/p/${gid}`, "layout");
}
