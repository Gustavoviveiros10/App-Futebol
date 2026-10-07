import Link from "next/link";
import { LogOut, RefreshCw, Repeat } from "lucide-react";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDate, money } from "@/lib/format";
import { PLANS, effectivePlan } from "@/lib/plans";
import { inviteLink, inviteText } from "@/lib/invite";
import { Badge, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { GroupFields } from "@/components/GroupFields";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CopyButton } from "@/components/CopyButton";
import { signOut } from "@/app/(auth)/actions";
import { leaveGroup, newSeason, regenerateInvite, startTrial, updateGroup, updateProfile } from "./actions";

export const metadata = { title: "Ajustes" };

export default async function Settings({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  const { group, isOrganizer, user } = await getMembership(gid);
  const sub = group.subscription;
  const plan = effectivePlan(sub);
  const seasons = isOrganizer ? await db.season.findMany({ where: { groupId: gid }, orderBy: { startsAt: "desc" } }) : [];
  const now = new Date();

  return (
    <>
      <PageHeader title="Ajustes" back={`/p/${gid}`} />
      <div className="flex flex-col gap-4">
        {isOrganizer && (
          <>
            <section className="card">
              <p className="mb-1 font-extrabold">Plano</p>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone={plan === "FREE" ? "gray" : "green"}>{PLANS[plan].name}</Badge>
                {sub?.status === "TRIALING" && sub.currentPeriodEnd && sub.currentPeriodEnd > now && (
                  <span className="text-sm text-black/50">teste grátis até {fmtDate(sub.currentPeriodEnd, group.timezone)}</span>
                )}
              </div>
              <div className="grid gap-2">
                {(["FREE", "PRO", "PREMIUM"] as const).map((k) => (
                  <div key={k} className={`rounded-2xl p-3 ring-1 ${plan === k ? "bg-pitch-50 ring-pitch-300" : "ring-black/5"}`}>
                    <div className="flex items-baseline justify-between">
                      <p className="font-bold">{PLANS[k].name}</p>
                      <p className="font-black">{PLANS[k].priceCents ? `${money(PLANS[k].priceCents)}/mês` : "Grátis"}</p>
                    </div>
                    <p className="text-xs text-black/50">{PLANS[k].features.join(" · ")}</p>
                  </div>
                ))}
              </div>
              {plan === "FREE" && !sub?.currentPeriodEnd && (
                <form action={startTrial.bind(null, gid)} className="mt-3">
                  <SubmitButton className="btn-primary w-full">Testar o Pro grátis por 30 dias</SubmitButton>
                </form>
              )}
              <p className="mt-3 text-xs text-black/45">A assinatura com cartão/PIX chega em breve. Enquanto isso, nada é cobrado.</p>
            </section>

            <section className="card">
              <p className="mb-1 font-extrabold">Convite</p>
              <p className="mb-3 break-all rounded-xl bg-black/[0.04] px-3 py-2 font-mono text-xs">{inviteLink(group.inviteCode)}</p>
              <div className="grid grid-cols-2 gap-2">
                <WhatsAppButton className="btn-whatsapp btn-sm" label="WhatsApp" text={inviteText(group.name, group.inviteCode)} />
                <CopyButton text={inviteLink(group.inviteCode)} className="btn-ghost btn-sm" />
              </div>
              <form action={regenerateInvite.bind(null, gid)} className="mt-2">
                <ConfirmButton className="btn-ghost btn-sm w-full text-black/55" message="Gerar um novo link? O link antigo para de funcionar.">
                  <RefreshCw size={14} /> Gerar novo link
                </ConfirmButton>
              </form>
            </section>

            <section className="card">
              <p className="mb-4 font-extrabold">Dados da pelada</p>
              <ActionForm action={updateGroup.bind(null, gid)}>
                <GroupFields g={group} withDueDay />
                <SubmitButton>Salvar</SubmitButton>
              </ActionForm>
            </section>

            <section className="card">
              <p className="mb-1 font-extrabold">Temporadas</p>
              <p className="mb-3 text-sm text-black/50">Começar uma nova temporada zera os rankings da temporada sem apagar o histórico.</p>
              <ul className="mb-3 divide-y divide-black/5">
                {seasons.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-semibold">{s.name}</span>
                    {s.active ? <Badge tone="green">Atual</Badge> : <span className="text-black/45">{fmtDate(s.startsAt, group.timezone)} – {s.endsAt ? fmtDate(s.endsAt, group.timezone) : ""}</span>}
                  </li>
                ))}
              </ul>
              <ActionForm action={newSeason.bind(null, gid)} className="flex flex-col gap-2" resetOnSuccess>
                <input className="input" name="name" placeholder={`Temporada ${now.getFullYear()} — ${now.getMonth() < 6 ? "1º" : "2º"} semestre`} required />
                <SubmitButton className="btn-ghost w-full">Iniciar nova temporada</SubmitButton>
              </ActionForm>
            </section>
          </>
        )}

        <section className="card">
          <p className="mb-3 font-extrabold">Minha conta</p>
          <ActionForm action={updateProfile.bind(null, gid)} className="flex flex-col gap-2">
            <label className="label" htmlFor="name">Seu nome</label>
            <input className="input" id="name" name="name" defaultValue={user.name} required />
            <p className="text-xs text-black/45">{user.email}</p>
            <SubmitButton className="btn-ghost w-full">Salvar nome</SubmitButton>
          </ActionForm>
        </section>

        <Link href="/app?todas=1" className="btn-ghost"><Repeat size={18} /> Trocar de pelada</Link>
        <form action={signOut}>
          <SubmitButton className="btn-ghost w-full"><LogOut size={18} /> Sair da conta</SubmitButton>
        </form>
        {group.ownerId !== user.id && (
          <form action={leaveGroup.bind(null, gid)}>
            <ConfirmButton className="btn-danger w-full" message={`Sair da ${group.name}? Seu histórico continua na pelada.`}>Sair desta pelada</ConfirmButton>
          </form>
        )}
      </div>
    </>
  );
}
