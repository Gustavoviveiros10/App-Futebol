import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { WEEKDAYS } from "@/lib/format";
import { Avatar } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { joinGroup } from "./actions";

export const metadata = { title: "Convite" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const group = await db.group.findUnique({
    where: { inviteCode: code },
    include: { players: { where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nickname: true, photo: true, userId: true } } },
  });
  if (!group) notFound();
  const user = await getCurrentUser();
  const already = user && group.players.some((p) => p.userId === user.id);
  const unclaimed = group.players.filter((p) => !p.userId);
  const next = `/convite/${code}`;

  return (
    <div className="min-h-dvh">
      <div className="pitch-gradient px-6 pb-20 pt-6 text-center text-white">
        <div className="flex justify-center"><Logo /></div>
        <p className="mt-6 text-sm text-white/70">Você foi convidado para</p>
        <h1 className="mt-1 text-5xl">{group.name}</h1>
        <p className="mt-2 text-sm text-white/70">
          {[group.weekday != null ? WEEKDAYS[group.weekday] : null, group.time, group.location].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-sm text-white/60">{group.players.length} jogadores</p>
      </div>
      <main className="mx-auto -mt-12 max-w-md px-4 pb-10">
        {!user ? (
          <div className="card flex flex-col gap-3 p-6 text-center">
            <p className="font-bold">Crie sua conta para confirmar presença, ver os times e suas estatísticas.</p>
            <Link href={`/cadastro?next=${encodeURIComponent(next)}`} className="btn-primary">Criar conta e entrar</Link>
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-ghost">Já tenho conta</Link>
          </div>
        ) : already ? (
          <div className="card p-6 text-center">
            <p className="font-bold">Você já faz parte desta pelada.</p>
            <Link href={`/p/${group.id}`} className="btn-primary mt-4 w-full">Abrir pelada</Link>
          </div>
        ) : (
          <div className="card p-5">
            <p className="text-lg font-extrabold">Quem é você nesta pelada?</p>
            <p className="mb-4 text-sm text-fg/55">Se o organizador já te cadastrou, escolha seu nome para manter seu histórico.</p>
            {unclaimed.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                {unclaimed.map((p) => (
                  <form key={p.id} action={joinGroup.bind(null, code, p.id)}>
                    <SubmitButton pendingText="Entrando..." className="btn w-full justify-start bg-fg/[0.04] px-3 py-2.5 text-sm hover:bg-accent/10">
                      <Avatar name={p.name} photo={p.photo} size={28} />
                      <span className="truncate">{p.nickname || p.name}</span>
                    </SubmitButton>
                  </form>
                ))}
              </div>
            )}
            <form action={joinGroup.bind(null, code, null)}>
              <SubmitButton pendingText="Entrando..." className="btn-primary w-full">
                {unclaimed.length ? "Não estou na lista, entrar como novo" : `Entrar como ${user.name}`}
              </SubmitButton>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
