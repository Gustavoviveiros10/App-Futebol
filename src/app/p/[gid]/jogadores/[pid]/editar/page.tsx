import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { PlayerFields } from "@/components/PlayerFields";
import { reactivatePlayer, removePlayer, unlinkAccount, updatePlayer } from "../../actions";

export const metadata = { title: "Editar jogador" };

export default async function EditPlayer({ params }: { params: Promise<{ gid: string; pid: string }> }) {
  const { gid, pid } = await params;
  const { group, isOrganizer, isOwner: iAmOwner, player: me } = await getMembership(gid);
  if (!isOrganizer) redirect(`/p/${gid}/jogadores/${pid}`);
  const p = await db.player.findFirst({ where: { id: pid, groupId: gid }, include: { user: { select: { email: true } } } });
  if (!p) notFound();
  const isOwner = p.userId === group.ownerId;
  return (
    <>
      <PageHeader title="Editar jogador" back={`/p/${gid}/jogadores/${pid}`} />
      <div className="card p-5">
        <ActionForm action={updatePlayer.bind(null, gid, pid)}>
          <PlayerFields p={p} defaultMonthly={group.monthlyFeeCents} canSetRole={iAmOwner && !isOwner && !!p.userId && p.id !== me.id} />
          <SubmitButton>Salvar</SubmitButton>
        </ActionForm>
      </div>

      {p.id !== me.id && !isOwner && (
        <div className="mt-4 flex flex-col gap-2">
          {p.user && (
            <form action={unlinkAccount.bind(null, gid, pid)}>
              <p className="mb-2 px-1 text-sm text-fg/50">Conta vinculada: {p.user.email}</p>
              <ConfirmButton className="btn-ghost w-full" message="Desvincular a conta deste jogador? Ele poderá entrar de novo pelo convite.">
                Desvincular conta
              </ConfirmButton>
            </form>
          )}
          {p.active ? (
            <form action={removePlayer.bind(null, gid, pid)}>
              <ConfirmButton className="btn-danger w-full" message={`Remover ${p.name} da pelada? O histórico dele é mantido.`}>
                Remover da pelada
              </ConfirmButton>
            </form>
          ) : (
            <form action={reactivatePlayer.bind(null, gid, pid)}>
              <SubmitButton className="btn-primary w-full">Reativar jogador</SubmitButton>
            </form>
          )}
        </div>
      )}
    </>
  );
}
