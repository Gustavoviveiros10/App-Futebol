import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/subscription";
import { PageHeader } from "@/components/ui";
import { GroupFields } from "@/components/GroupFields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { createGroup } from "../actions";

export const metadata = { title: "Nova pelada" };

export default async function NewGroup() {
  const user = await requireUser();
  if (!(await getUserPlan(user.id)).canCreate) redirect("/app/planos");
  return (
    <div className="mx-auto max-w-md px-4 pb-10">
      <PageHeader title="Criar pelada" back="/app?todas=1" subtitle="Dá para mudar tudo depois." />
      <div className="card p-5">
        <ActionForm action={createGroup}>
          <GroupFields />
          <SubmitButton pendingText="Criando...">Criar pelada</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
