import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/actions";
import { signOut } from "../(auth)/actions";

export const metadata = { title: "Minhas peladas" };

export default async function MyGroups({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const user = await requireUser();
  const { todas } = await searchParams;
  const memberships = await db.player.findMany({
    where: { userId: user.id, active: true },
    include: { group: { include: { _count: { select: { players: { where: { active: true } } } } } } },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 1 && !todas) redirect(`/p/${memberships[0].groupId}`);

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-10">
      <header className="flex items-center justify-between py-5">
        <span className="text-lg font-black tracking-tight">⚽ {APP_NAME}</span>
        <form action={signOut}>
          <button className="flex items-center gap-1 text-sm text-black/50">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </header>
      <h1 className="text-3xl font-extrabold tracking-tight">Olá, {user.name.split(" ")[0]}!</h1>
      <p className="mb-6 text-black/55">{memberships.length ? "Escolha uma pelada." : "Vamos começar criando sua pelada."}</p>

      <div className="flex flex-col gap-3">
        {memberships.map((m) => (
          <Link key={m.id} href={`/p/${m.groupId}`} className="card flex items-center gap-4 transition hover:ring-pitch-300">
            <div className="pitch-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-2xl">⚽</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{m.group.name}</p>
              <p className="text-sm text-black/50">
                {m.role === "ORGANIZER" ? "Organizador" : "Jogador"} · {m.group._count.players} jogadores
              </p>
            </div>
            <ChevronRight className="text-black/30" />
          </Link>
        ))}
        <Link href="/app/nova" className="btn-primary mt-2 py-4">
          <Plus size={20} /> Criar uma pelada
        </Link>
        <p className="mt-2 text-center text-sm text-black/45">Vai jogar na pelada de alguém? Peça o link de convite ao organizador.</p>
      </div>
    </div>
  );
}
