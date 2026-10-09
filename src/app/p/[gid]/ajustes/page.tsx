import Link from "next/link";
import { LogOut, RefreshCw, Repeat } from "lucide-react";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDate } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { inviteLink, inviteText } from "@/lib/invite";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { MAX_ADMINS } from "@/lib/tenancy";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { GroupFields } from "@/components/GroupFields";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CopyButton } from "@/components/CopyButton";
import { signOut } from "@/app/(auth)/actions";
import { addAdmin, leaveGroup, newSeason, removeAdmin, regenerateInvite, updateGroup, updateProfile } from "./actions";

export const metadata = { title: "Ajustes" };

export default async function Settings({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  const { group, isOrganizer, isOwner, user } = await getMembership(gid);
  const { sub, plan } = await getUserPlan(user.id);
  const seasons = isOrganizer ? await db.season.findMany({ where: { groupId: gid }, orderBy: { startsAt: "desc" } }) : [];
  const now = new Date();
  const members = isOrganizer ? await db.player.findMany({ where: { groupId: gid, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nickname: true, photo: true, role: true, userId: true } }) : [];
  const owner = members.find((m) => m.userId === group.ownerId);
  const admins = members.filter((m) => m.role === "ORGANIZER" && m.userId !== group.ownerId);
  const eligible = members.filter((m) => m.role !== "ORGANIZER" && m.userId);

  return (
    <>
      <PageHeader title="Ajustes" back={`/p/${gid}`} />
      <div className="flex flex-col gap-4">
        {isOrganizer && (
          <>
            {isOwner && (
            <section className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-extrabold">Seu plano</p>
                  <p className="text-sm text-fg/50">
                    {PLANS[plan].name}
                    {sub?.status === "TRIALING" && sub.currentPeriodEnd && sub.currentPeriodEnd > now && ` · teste grátis até ${fmtDate(sub.currentPeriodEnd, group.timezone)}`}
                  </p>
                </div>
                <Link href="/app/planos" className="btn-ghost btn-sm">Ver planos</Link>
              </div>
            </section>
            )}

            <section className="card">
              <p className="mb-1 font-extrabold">Administradores</p>
              <p className="mb-3 text-sm text-fg/50">
                Até {MAX_ADMINS} pessoas além do dono. Administradores criam e editam partidas, iniciam o jogo, montam os times, lançam resultados e cobram. Só o dono mexe no plano.
              </p>
              <ul className="mb-3 divide-y divide-fg/[0.07]">
                {owner && (
                  <li className="flex items-center gap-3 py-2">
                    <Avatar name={owner.name} photo={owner.photo} size={32} />
                    <span className="flex-1 truncate font-semibold">{owner.nickname || owner.name}</span>
                    <Badge tone="dark">Dono</Badge>
                  </li>
                )}
                {admins.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2">
                    <Avatar name={a.name} photo={a.photo} size={32} />
                    <span className="flex-1 truncate font-semibold">{a.nickname || a.name}</span>
                    {isOwner ? (
                      <form action={removeAdmin.bind(null, gid, a.id)}>
                        <ConfirmButton className="chip bg-fg/[0.06] text-fg/60 hover:text-red-400" message={`Tirar ${a.nickname || a.name} dos administradores?`}>Tirar</ConfirmButton>
                      </form>
                    ) : (
                      <Badge tone="green">Admin</Badge>
                    )}
                  </li>
                ))}
              </ul>
              {isOwner && admins.length < MAX_ADMINS && (
                eligible.length ? (
                  <ActionForm action={addAdmin.bind(null, gid)} className="flex gap-2">
                    <select className="input flex-1" name="playerId" defaultValue="" aria-label="Novo administrador" required>
                      <option value="" disabled>Escolher jogador</option>
                      {eligible.map((m) => <option key={m.id} value={m.id}>{m.nickname || m.name}</option>)}
                    </select>
                    <SubmitButton className="btn-ghost shrink-0 px-4">Adicionar</SubmitButton>
                  </ActionForm>
                ) : (
                  <p className="text-xs text-fg/45">Para virar administrador, a pessoa precisa ter entrado na pelada com conta.</p>
                )
              )}
              {isOwner && admins.length >= MAX_ADMINS && <p className="text-xs text-fg/45">Limite de {MAX_ADMINS} administradores atingido.</p>}
            </section>

            <section className="card">
              <p className="mb-1 font-extrabold">Convite</p>
              <p className="mb-3 break-all rounded-xl bg-fg/[0.04] px-3 py-2 font-mono text-xs">{inviteLink(group.inviteCode)}</p>
              <div className="grid grid-cols-2 gap-2">
                <WhatsAppButton className="btn-whatsapp btn-sm" label="WhatsApp" text={inviteText(group.name, group.inviteCode)} />
                <CopyButton text={inviteLink(group.inviteCode)} className="btn-ghost btn-sm" />
              </div>
              <form action={regenerateInvite.bind(null, gid)} className="mt-2">
                <ConfirmButton className="btn-ghost btn-sm w-full text-fg/55" message="Gerar um novo link? O link antigo para de funcionar.">
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
              <p className="mb-3 text-sm text-fg/50">Começar uma nova temporada zera os rankings da temporada sem apagar o histórico.</p>
              <ul className="mb-3 divide-y divide-fg/[0.07]">
                {seasons.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-semibold">{s.name}</span>
                    {s.active ? <Badge tone="green">Atual</Badge> : <span className="text-fg/45">{fmtDate(s.startsAt, group.timezone)} – {s.endsAt ? fmtDate(s.endsAt, group.timezone) : ""}</span>}
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
            <p className="text-xs text-fg/45">{user.email}</p>
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
