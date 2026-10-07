import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { POSITIONS } from "@/lib/format";
import { playerFinanceStatus } from "@/lib/finance";
import { inviteLink, inviteText } from "@/lib/invite";
import { playerLimit } from "@/lib/plans";
import { Avatar, Badge, Empty, PageHeader } from "@/components/ui";
import { FinanceBadge } from "@/components/FinanceBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CopyButton } from "@/components/CopyButton";

export const metadata = { title: "Jogadores" };

export default async function PlayersPage({ params, searchParams }: { params: Promise<{ gid: string }>; searchParams: Promise<{ inativos?: string }> }) {
  const { gid } = await params;
  const { inativos } = await searchParams;
  const { group, isOrganizer } = await getMembership(gid);
  const players = await db.player.findMany({
    where: { groupId: gid, active: !inativos },
    orderBy: [{ name: "asc" }],
    include: isOrganizer ? { payments: { where: { status: "PENDING" }, select: { status: true, dueDate: true } } } : undefined,
  });
  const limit = playerLimit(group.subscription);

  return (
    <>
      <PageHeader
        title={inativos ? "Jogadores inativos" : "Jogadores"}
        back={inativos ? `/p/${gid}/jogadores` : undefined}
        subtitle={`${players.length} ${inativos ? "inativos" : limit ? `de ${limit} no plano gratuito` : "na pelada"}`}
        action={
          isOrganizer && !inativos ? (
            <Link href={`/p/${gid}/jogadores/novo`} className="btn-primary btn-sm">
              <UserPlus size={18} /> Novo
            </Link>
          ) : undefined
        }
      />

      {isOrganizer && !inativos && (
        <div className="card mb-4 bg-pitch-50 ring-pitch-200">
          <p className="font-bold">Convide a galera</p>
          <p className="mb-3 text-sm text-black/55">Quem entrar pelo link escolhe seu nome na lista e já pode confirmar presença.</p>
          <div className="grid grid-cols-2 gap-2">
            <WhatsAppButton text={inviteText(group.name, group.inviteCode)} label="WhatsApp" className="btn-whatsapp btn-sm" />
            <CopyButton text={inviteLink(group.inviteCode)} className="btn-ghost btn-sm bg-white" />
          </div>
        </div>
      )}

      {players.length === 0 ? (
        <Empty icon="👥" title={inativos ? "Ninguém inativo" : "Nenhum jogador ainda"} text="Cadastre os jogadores ou mande o link de convite no grupo." />
      ) : (
        <div className="card divide-y divide-black/5 p-0">
          {players.map((p) => {
            const fin = "payments" in p ? playerFinanceStatus(p.payments as { status: "PENDING"; dueDate: Date }[]) : null;
            return (
              <Link key={p.id} href={`/p/${gid}/jogadores/${p.id}`} className="flex items-center gap-3 px-4 py-3 first:rounded-t-3xl last:rounded-b-3xl hover:bg-black/[0.02]">
                <Avatar name={p.name} photo={p.photo} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.nickname || p.name}
                    {p.role === "ORGANIZER" && <span className="ml-1.5 text-xs">👑</span>}
                  </p>
                  <p className="truncate text-sm text-black/50">
                    {POSITIONS[p.position].emoji} {POSITIONS[p.position].label} · {p.billingType === "MONTHLY" ? "Mensalista" : "Avulso"}
                    {!p.userId && " · sem conta"}
                  </p>
                </div>
                {fin && <FinanceBadge status={fin} />}
                {!fin && !p.userId && <Badge>convite</Badge>}
                <ChevronRight size={18} className="text-black/25" />
              </Link>
            );
          })}
        </div>
      )}
      {isOrganizer && !inativos && (
        <Link href={`/p/${gid}/jogadores?inativos=1`} className="mt-4 block text-center text-sm text-black/45">
          Ver jogadores inativos
        </Link>
      )}
    </>
  );
}
