import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { utcToZonedInput } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { MatchFields } from "@/components/MatchFields";
import { cancelMatch, updateMatch } from "../../actions";

export const metadata = { title: "Editar partida" };

export default async function EditMatch({ params }: { params: Promise<{ gid: string; mid: string }> }) {
  const { gid, mid } = await params;
  const { group, isOrganizer } = await getMembership(gid);
  if (!isOrganizer) redirect(`/p/${gid}/partidas/${mid}`);
  const m = await db.match.findFirst({ where: { id: mid, groupId: gid } });
  if (!m) notFound();
  return (
    <>
      <PageHeader title="Editar partida" back={`/p/${gid}/partidas/${mid}`} />
      <div className="card p-5">
        <ActionForm action={updateMatch.bind(null, gid, mid)}>
          <MatchFields v={{ ...m, ...utcToZonedInput(m.date, group.timezone) }} />
          <SubmitButton>Salvar</SubmitButton>
        </ActionForm>
      </div>
      {m.status !== "FINISHED" && m.status !== "CANCELED" && (
        <form action={cancelMatch.bind(null, gid, mid)} className="mt-4">
          <ConfirmButton className="btn-danger w-full" message="Cancelar esta partida? Os confirmados serão avisados.">
            Cancelar partida
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
