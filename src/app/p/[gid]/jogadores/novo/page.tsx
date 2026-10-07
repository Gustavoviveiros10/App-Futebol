import { redirect } from "next/navigation";
import { getMembership } from "@/lib/tenancy";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PlayerFields } from "@/components/PlayerFields";
import { createPlayer } from "../actions";

export const metadata = { title: "Novo jogador" };

export default async function NewPlayer({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  const { group, isOrganizer } = await getMembership(gid);
  if (!isOrganizer) redirect(`/p/${gid}/jogadores`);
  return (
    <>
      <PageHeader title="Novo jogador" back={`/p/${gid}/jogadores`} />
      <div className="card p-5">
        <ActionForm action={createPlayer.bind(null, gid)} resetOnSuccess>
          <PlayerFields defaultMonthly={group.monthlyFeeCents} />
          <div className="grid grid-cols-2 gap-2">
            <SubmitButton className="btn-ghost" name="another" value="1">Salvar e +1</SubmitButton>
            <SubmitButton>Salvar</SubmitButton>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
