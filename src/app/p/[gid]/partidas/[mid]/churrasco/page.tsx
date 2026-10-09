import { notFound } from "next/navigation";
import { Beef, Check, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDayMonth, money, weekdayLong } from "@/lib/format";
import { splitBbq } from "@/lib/bbq";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { AutoSubmitCheckbox } from "@/components/AutoSubmitCheckbox";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { groupPremium } from "@/lib/features";
import { PremiumLock } from "@/components/PremiumLock";
import { addGuest, addItem, removeGuest, removeItem, startBbq, togglePerson } from "./actions";

export const metadata = { title: "Dividir o churrasco" };

export default async function BbqPage({ params }: { params: Promise<{ gid: string; mid: string }> }) {
  const { gid, mid } = await params;
  const { group, isOwner } = await getMembership(gid);
  const match = await db.match.findFirst({
    where: { id: mid, groupId: gid },
    include: { bbq: { include: { people: { orderBy: [{ guest: "asc" }, { name: "asc" }] }, items: { orderBy: { createdAt: "asc" } } } } },
  });
  if (!match) notFound();
  const tz = group.timezone;
  const subtitle = `Depois do jogo de ${weekdayLong(match.date, tz).toLowerCase()}, ${fmtDayMonth(match.date, tz)}`;
  const back = `/p/${gid}/partidas/${mid}`;

  if (!match.bbq && !(await groupPremium(gid)))
    return (
      <>
        <PageHeader title="Dividir o churrasco" subtitle={subtitle} back={back} />
        <PremiumLock isOwner={isOwner} title="Dividir o churrasco" text="Lance o que cada um pagou na resenha e o app diz quem paga quem, com o mínimo de transferências." />
      </>
    );

  if (!match.bbq)
    return (
      <>
        <PageHeader title="Dividir o churrasco" subtitle={subtitle} back={back} />
        <div className="card flex flex-col items-center px-6 py-10 text-center">
          <Beef size={30} className="text-fg/35" />
          <p className="mt-3 text-lg font-bold">Acertar as contas da resenha</p>
          <p className="mt-1 max-w-xs text-sm text-fg/55">Lance o que cada um pagou e o app diz quem paga quem. É opcional e não mexe no financeiro da pelada.</p>
          <form action={startBbq.bind(null, gid, mid)} className="mt-5 w-full">
            <SubmitButton className="btn-primary w-full" pendingText="Preparando...">Começar a divisão</SubmitButton>
          </form>
        </div>
      </>
    );

  const { people, items } = match.bbq;
  const r = splitBbq(people, items);
  const name = new Map(people.map((p) => [p.id, p.name]));
  const shareOf = new Map(r.balance.map((b) => [b.id, b]));
  const going = people.filter((p) => p.attending);
  const plain = going.filter((p) => !p.drinks);
  const drinkers = going.filter((p) => p.drinks);
  const text = [
    `🍖 *Churrasco — ${fmtDayMonth(match.date, tz)}*`,
    `Total: ${money(r.total)} · ${r.going} pessoas`,
    "",
    "*Quem paga quem (Pix):*",
    ...(r.transfers.length ? r.transfers.map((t) => `• ${name.get(t.from)} → ${name.get(t.to)}: ${money(t.cents)}`) : ["Ninguém deve nada."]),
  ].join("\n");

  return (
    <>
      <PageHeader title="Dividir o churrasco" subtitle={subtitle} back={back} />
      <p className="mb-4 text-sm text-fg/55">Uma ajuda pra acertar as contas da resenha. É opcional e não mexe no financeiro da pelada.</p>

      <p className="section-title">Quem foi</p>
      <div className="card mb-2 divide-y divide-fg/[0.07] p-0">
        {people.map((p) => (
          <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${p.attending ? "" : "opacity-50"}`}>
            <form action={togglePerson.bind(null, gid, mid, p.id, "attending")} className="min-w-0 flex-1">
              <AutoSubmitCheckbox checked={p.attending} label={<span className="truncate font-medium">{p.name}{p.guest && <span className="ml-1.5 text-xs text-fg/45">convidado</span>}</span>} />
            </form>
            <form action={togglePerson.bind(null, gid, mid, p.id, "drinks")}>
              <AutoSubmitCheckbox checked={p.drinks} label={<span className="text-xs text-fg/60">bebe</span>} />
            </form>
            {p.guest && (
              <form action={removeGuest.bind(null, gid, mid, p.id)}>
                <button className="p-1 text-fg/35 hover:text-red-400" aria-label={`Tirar ${p.name}`}><Trash2 size={15} /></button>
              </form>
            )}
          </div>
        ))}
      </div>
      <ActionForm action={addGuest.bind(null, gid, mid)} resetOnSuccess className="mb-5 flex flex-col gap-2">
        <div className="flex gap-2">
          <input className="input flex-1" name="name" placeholder="Convidado de fora (ex.: Primo do Rafa)" aria-label="Nome do convidado" />
          <SubmitButton className="btn-ghost shrink-0 px-4" pendingText="...">+ Adicionar</SubmitButton>
        </div>
      </ActionForm>

      <p className="section-title">Gastos</p>
      <div className="card mb-2 divide-y divide-fg/[0.07] p-0">
        {items.length === 0 && <p className="px-4 py-3 text-sm text-fg/45">Nenhum gasto ainda.</p>}
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{it.description}</p>
              <p className="text-xs text-fg/50">{name.get(it.payerId)} pagou{it.drinksOnly ? " · só quem bebe" : ""}</p>
            </div>
            <span className="text-sm font-bold">{money(it.amountCents)}</span>
            <form action={removeItem.bind(null, gid, mid, it.id)}>
              <button className="p-1 text-fg/35 hover:text-red-400" aria-label={`Excluir ${it.description}`}><Trash2 size={15} /></button>
            </form>
          </div>
        ))}
      </div>
      <details className="card mb-5">
        <summary className="cursor-pointer list-none text-sm font-bold">+ Adicionar gasto</summary>
        <ActionForm action={addItem.bind(null, gid, mid)} resetOnSuccess className="mt-3 flex flex-col gap-3">
          <input className="input" name="description" placeholder="O que foi? Ex.: carne, cerveja, carvão" aria-label="Descrição do gasto" required />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" name="amount" inputMode="decimal" placeholder="Valor (R$)" aria-label="Valor" required />
            <select className="input" name="payerId" defaultValue="" aria-label="Quem pagou" required>
              <option value="" disabled>Quem pagou?</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="drinksOnly" className="h-5 w-5 accent-accent" /> Só pra quem bebe
          </label>
          <SubmitButton className="btn-ghost w-full">Adicionar</SubmitButton>
        </ActionForm>
      </details>

      <div className="card mb-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-fg/55">Total</span>
          <span className="font-display text-3xl font-bold">{money(r.total)}</span>
        </div>
        {going.length > 0 && r.total > 0 && (
          <p className="mt-1 text-xs text-fg/55">
            {plain[0] && <>Quem não bebe: {money(shareOf.get(plain[0].id)!.share)} cada. </>}
            {drinkers[0] && <>Quem bebe: {money(shareOf.get(drinkers[0].id)!.share)} cada.</>}
          </p>
        )}
      </div>

      <p className="section-title">Quem paga quem</p>
      <div className="card mb-4 divide-y divide-fg/[0.07] p-0">
        {r.transfers.length === 0 && <p className="px-4 py-3 text-sm text-fg/45">{r.total ? "Tudo certo, ninguém deve nada." : "Adicione os gastos para ver a conta."}</p>}
        {r.transfers.map((t) => {
          const debtor = people.find((p) => p.id === t.from)!;
          return (
            <div key={`${t.from}-${t.to}`} className={`flex items-center gap-3 px-4 py-2.5 ${debtor.paid ? "opacity-50" : ""}`}>
              <p className="min-w-0 flex-1 text-sm">
                <b>{name.get(t.from)}</b> <span className="text-fg/45">paga</span> <b>{name.get(t.to)}</b>
              </p>
              <span className={`text-sm font-bold ${debtor.paid ? "line-through" : ""}`}>{money(t.cents)}</span>
              <form action={togglePerson.bind(null, gid, mid, debtor.id, "paid")}>
                <button className={`chip ${debtor.paid ? "bg-accent/15 text-accent" : "bg-fg/[0.06] text-fg/60"}`}>{debtor.paid ? <><Check size={12} /> pago</> : "marcar pago"}</button>
              </form>
            </div>
          );
        })}
      </div>
      <WhatsAppButton label="Mandar a conta no grupo" text={text} />
    </>
  );
}
