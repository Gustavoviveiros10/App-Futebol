import { redirect } from "next/navigation";
import { getMembership } from "@/lib/tenancy";
import { nextOccurrence } from "@/lib/matches";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { MatchFields } from "@/components/MatchFields";
import { createMatch } from "../actions";

export const metadata = { title: "Nova partida" };

export default async function NewMatch({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  const { group, isOrganizer } = await getMembership(gid);
  if (!isOrganizer) redirect(`/p/${gid}/partidas`);
  const next = nextOccurrence(group.weekday, group.time, group.timezone);
  return (
    <>
      <PageHeader title="Nova partida" back={`/p/${gid}/partidas`} subtitle="Já preenchemos com o padrão da pelada." />
      <div className="card p-5">
        <ActionForm action={createMatch.bind(null, gid)}>
          <MatchFields v={{ ...next, location: group.location, address: group.address, lat: group.lat, lng: group.lng, durationMin: group.durationMin, singleFeeCents: group.singleFeeCents, maxPlayers: group.maxPlayers, teamsCount: group.teamsCount, format: group.format, access: group.access }} />
          <SubmitButton pendingText="Criando...">Criar partida</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
