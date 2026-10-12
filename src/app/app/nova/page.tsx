import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/subscription";
import { PageHeader } from "@/components/ui";
import { GroupFields } from "@/components/GroupFields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { createGroup } from "../actions";

export const metadata = { title: "Nova pelada" };

type Q = { local?: string; endereco?: string; lat?: string; lng?: string };

export default async function NewGroup({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/nova?${new URLSearchParams(q as Record<string, string>)}`)}`);
  // "Criar pelada aqui" no mapa de quadras já traz o local preenchido
  const lat = Number(q.lat), lng = Number(q.lng);
  const place = q.local ? { location: q.local.slice(0, 80), address: q.endereco?.slice(0, 160) || null, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null } : undefined;
  if (!(await getUserPlan(user.id)).canCreate) redirect("/app/planos");
  return (
    <div className="mx-auto max-w-md px-4 pb-10">
      <PageHeader title="Criar pelada" back="/app?todas=1" subtitle="Dá para mudar tudo depois." />
      <div className="card p-5">
        <ActionForm action={createGroup}>
          <GroupFields g={place} />
          <SubmitButton pendingText="Criando...">Criar pelada</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
