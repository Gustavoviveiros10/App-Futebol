import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Onde o app instalado abre. Com conta: a área do usuário.
 * Sem conta, mas já confirmou presença por link neste aparelho: a próxima partida da pelada dele.
 */
export async function GET() {
  if (await getCurrentUser()) redirect("/app");
  const groupIds = (await cookies()).getAll().filter((c) => c.name.startsWith("jc_")).map((c) => c.name.slice(3));
  if (groupIds.length) {
    const next = await db.match.findFirst({
      where: { groupId: { in: groupIds }, shareCode: { not: null }, status: { in: ["SCHEDULED", "CLOSED", "DRAWN"] }, date: { gte: new Date(Date.now() - 3 * 3600_000) } },
      orderBy: { date: "asc" },
      select: { shareCode: true },
    });
    if (next?.shareCode) redirect(`/j/${next.shareCode}`);
  }
  redirect("/");
}
