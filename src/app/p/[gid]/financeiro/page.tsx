import Link from "next/link";
import { FINANCE_PREMIUM, groupPremium } from "@/lib/features";
import { PremiumLock } from "@/components/PremiumLock";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { fmtDate, money, monthKey, monthLabel, utcToZonedInput } from "@/lib/format";
import { financeSummary, monthRange, paymentView, shiftMonth } from "@/lib/finance";
import { chargeText } from "@/lib/share";
import { Avatar, Empty, PageHeader } from "@/components/ui";
import { FinanceBadge } from "@/components/FinanceBadge";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { cancelPayment, createCharge, createExpense, deleteExpense, generateCharges, markPaid, markPending } from "./actions";
import { CATEGORIES, monthExpenses } from "@/lib/expenses";
import { ReceiptInput } from "@/components/ReceiptInput";

export const metadata = { title: "Financeiro" };

const FILTERS = [
  ["todos", "Todos"],
  ["pagos", "Pagos"],
  ["pendentes", "Pendentes"],
  ["atrasados", "Atrasados"],
  ["mensalistas", "Mensalistas"],
  ["avulsos", "Avulsos"],
] as const;
type Filter = (typeof FILTERS)[number][0];

const METHODS = [
  ["PIX", "PIX"],
  ["CASH", "Dinheiro"],
  ["TRANSFER", "Transferência"],
  ["CARD", "Cartão"],
  ["OTHER", "Outro"],
] as const;

export default async function FinancePage({ params, searchParams }: { params: Promise<{ gid: string }>; searchParams: Promise<{ mes?: string; f?: Filter }> }) {
  const { gid } = await params;
  const sp = await searchParams;
  const { group, isOrganizer, isOwner, player: me } = await getMembership(gid);
  const tz = group.timezone;

  if (!isOrganizer) return <MyFinance />;
  const premium = await groupPremium(gid);
  if (!premium && FINANCE_PREMIUM === "all")
    return (
      <>
        <PageHeader title="Financeiro" />
        <PremiumLock isOwner={isOwner} title="Financeiro da pelada" text="Cobre mensalidades e avulsos, veja quem está em dia, lance despesas e acompanhe o caixa da pelada." />
      </>
    );

  const current = monthKey(new Date(), tz);
  const key = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : current;
  const filter: Filter = FILTERS.some(([k]) => k === sp.f) ? sp.f! : "todos";
  const { start, end } = monthRange(key, tz);
  const [summary, exp] = await Promise.all([financeSummary(gid, key, tz), monthExpenses(gid, key, tz)]);
  const balance = summary.received - exp.total;

  const where: Prisma.PaymentWhereInput = { groupId: gid, status: { not: "CANCELED" } };
  if (filter === "atrasados") Object.assign(where, { status: "PENDING", dueDate: { lt: new Date() } });
  else Object.assign(where, { dueDate: { gte: start, lt: end } });
  if (filter === "pagos") where.status = "PAID";
  if (filter === "pendentes") where.status = "PENDING";
  if (filter === "mensalistas") where.type = "MONTHLY";
  if (filter === "avulsos") where.type = { in: ["MATCH", "OTHER"] };

  const [payments, players] = await Promise.all([
    db.payment.findMany({ where, include: { player: true, match: { select: { date: true } } }, orderBy: [{ status: "asc" }, { dueDate: "asc" }, { player: { name: "asc" } }] }),
    db.player.findMany({ where: { groupId: gid, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const shown = filter === "atrasados" ? payments.filter((p) => paymentView(p) === "OVERDUE") : payments;
  const maxRevenue = Math.max(1, ...summary.revenueByMonth.map((r) => r.cents));

  return (
    <>
      <PageHeader title="Financeiro" />
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-surface px-2 py-1.5 ring-1 ring-fg/[0.07]">
        <Link href={`?mes=${shiftMonth(key, -1)}&f=${filter}`} className="rounded-full p-2 hover:bg-fg/[0.06]" aria-label="Mês anterior"><ChevronLeft size={20} /></Link>
        <span className="font-bold">{monthLabel(key)}</span>
        <Link href={`?mes=${shiftMonth(key, 1)}&f=${filter}`} className="rounded-full p-2 hover:bg-fg/[0.06]" aria-label="Próximo mês"><ChevronRight size={20} /></Link>
      </div>

      <div className="pitch-gradient mb-3 rounded-2xl p-5 text-white">
        <p className="text-sm text-white/60">Recebido no mês</p>
        <p className="text-4xl font-black tracking-tight">{money(summary.received)}</p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-accent" style={{ width: `${summary.expected ? Math.round((summary.received / summary.expected) * 100) : 0}%` }} />
        </div>
        <p className="mt-1 text-xs text-white/60">de {money(summary.expected)} previstos</p>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="card p-3"><p className="text-lg font-extrabold text-gold">{money(summary.pending)}</p><p className="text-xs text-fg/50">Pendente</p></div>
        <div className="card p-3"><p className="text-lg font-extrabold text-red-400">{money(summary.overdue)}</p><p className="text-xs text-fg/50">Atrasado (total)</p></div>
        <div className="card p-3"><p className="text-lg font-extrabold">{summary.monthlyOk}/{summary.monthlyCount}</p><p className="text-xs text-fg/50">Mensalistas em dia</p></div>
      </div>

      {premium ? (
        <>
      <div className="card mb-4 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-lg font-extrabold text-accent">{money(summary.received)}</p><p className="text-xs text-fg/50">Entradas</p></div>
        <div><p className="text-lg font-extrabold text-red-400">{money(exp.total)}</p><p className="text-xs text-fg/50">Saídas</p></div>
        <div><p className={`text-lg font-extrabold ${balance < 0 ? "text-red-400" : ""}`}>{money(balance)}</p><p className="text-xs text-fg/50">Saldo</p></div>
      </div>

      <div className="card mb-4">
        <div className="flex items-baseline justify-between">
          <p className="section-title px-0">Despesas do mês</p>
          <span className="text-sm font-bold">{money(exp.total)}</span>
        </div>
        {exp.total > 0 && (
          <>
            <div className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-fg/[0.06]">
              {exp.byCategory.map((c) => (
                <div key={c.category} className={CATEGORIES[c.category].color} style={{ width: `${(c.cents / exp.total) * 100}%` }} />
              ))}
            </div>
            <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg/60">
              {exp.byCategory.map((c) => (
                <span key={c.category} className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${CATEGORIES[c.category].color}`} />{CATEGORIES[c.category].label} {money(c.cents)}</span>
              ))}
            </div>
          </>
        )}
        {exp.list.length === 0 && <p className="mb-3 text-sm text-fg/50">Nenhuma despesa lançada neste mês.</p>}
        <div className="divide-y divide-fg/[0.07]">
          {exp.list.map((e) => (
            <details key={e.id} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 py-2.5">
                <i className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORIES[e.category].color}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.description}</p>
                  <p className="text-xs text-fg/50">{CATEGORIES[e.category].label} · {e.recurring ? "todo mês" : fmtDate(e.date, tz).slice(0, 5)}{e.receipt ? " · com comprovante" : ""}</p>
                </div>
                <span className="text-sm font-bold">{money(e.amountCents)}</span>
              </summary>
              <div className="flex flex-col gap-2 pb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.receipt && <img src={e.receipt} alt={`Comprovante: ${e.description}`} className="max-h-64 w-full rounded-xl object-contain" />}
                <form action={deleteExpense.bind(null, gid, e.id)}>
                  <ConfirmButton className="btn-ghost btn-sm w-full text-red-400" message={e.recurring ? "Excluir esta despesa fixa? Ela some de todos os meses." : "Excluir esta despesa?"}>Excluir despesa</ConfirmButton>
                </form>
              </div>
            </details>
          ))}
        </div>
        <details className="mt-2">
          <summary className="btn-ghost btn-sm w-full cursor-pointer list-none">+ Lançar despesa</summary>
          <div className="mt-3">
            <ActionForm action={createExpense.bind(null, gid)} resetOnSuccess>
              <div>
                <label className="label" htmlFor="exp-desc">Descrição</label>
                <input className="input" id="exp-desc" name="description" placeholder="Aluguel da quadra, bola nova..." required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="exp-amount">Valor (R$)</label>
                  <input className="input" id="exp-amount" name="amount" inputMode="decimal" placeholder="350,00" required />
                </div>
                <div>
                  <label className="label" htmlFor="exp-date">Data</label>
                  <input className="input" id="exp-date" name="date" type="date" defaultValue={utcToZonedInput(new Date(), tz).date} required />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="exp-cat">Categoria</label>
                <select className="input" id="exp-cat" name="category" defaultValue="COURT">
                  {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="recurring" className="h-5 w-5 accent-accent" /> Repete todo mês
              </label>
              <ReceiptInput name="receipt" />
              <SubmitButton>Lançar despesa</SubmitButton>
            </ActionForm>
          </div>
        </details>
      </div>
        </>
      ) : (
        <PremiumLock className="mb-4" isOwner={isOwner} title="Caixa da pelada" text="Lance despesas (quadra, bola, coletes), guarde comprovantes e veja entradas, saídas e o saldo do mês." />
      )}

      {!summary.monthlyGenerated && summary.monthlyCount > 0 && (
        <form action={generateCharges.bind(null, gid, key)} className="card mb-4 bg-gold/10 ring-gold/30">
          <p className="font-bold">Mensalidades de {monthLabel(key).toLowerCase()} ainda não foram geradas</p>
          <p className="mb-3 text-sm text-fg/55">Cria uma cobrança para cada um dos {summary.monthlyCount} mensalistas, com vencimento no dia {group.paymentDueDay}.</p>
          <SubmitButton className="btn-dark w-full" pendingText="Gerando...">Gerar mensalidades</SubmitButton>
        </form>
      )}

      <div className="card mb-4">
        <p className="section-title px-0">Receita por mês</p>
        <div className="flex h-28 items-end gap-2">
          {summary.revenueByMonth.map((r) => (
            <div key={r.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-fg/45">{r.cents ? Math.round(r.cents / 100) : ""}</span>
              <div className={`w-full rounded-t-lg ${r.month === key ? "bg-accent" : "bg-fg/15"}`} style={{ height: `${Math.max(4, (r.cents / maxRevenue) * 80)}px` }} />
              <span className="text-[10px] font-semibold uppercase text-fg/45">{monthLabel(r.month).slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map(([k, l]) => (
          <Link key={k} href={`?mes=${key}&f=${k}`} className={`chip shrink-0 px-3.5 py-2 text-sm ${filter === k ? "bg-fg text-bg" : "bg-surface text-fg/60 ring-1 ring-fg/[0.07]"}`}>{l}</Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty icon={<Wallet size={26} />} title="Nada por aqui" text={filter === "todos" ? "Gere as mensalidades ou finalize uma partida para cobrar os avulsos." : "Nenhuma cobrança neste filtro."} />
      ) : (
        <div className="card divide-y divide-fg/[0.07] p-0">
          {shown.map((p) => {
            const view = paymentView(p);
            const what = p.type === "MONTHLY" ? `a mensalidade de ${monthLabel(p.reference!).toLowerCase()}` : p.type === "MATCH" ? `o avulso da pelada de ${fmtDate(p.match?.date ?? p.dueDate, tz)}` : `"${p.description}"`;
            return (
              <details key={p.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <Avatar name={p.player.name} photo={p.player.photo} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.player.nickname || p.player.name}</p>
                    <p className="truncate text-xs text-fg/50">
                      {p.type === "MONTHLY" ? "Mensalista" : p.type === "MATCH" ? "Avulso" : p.description} · vence {fmtDate(p.dueDate, tz).slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold">{money(p.amountCents)}</span>
                    <FinanceBadge status={view} />
                  </div>
                </summary>
                <div className="flex flex-col gap-2 bg-fg/[0.02] px-4 pb-4 pt-2">
                  {p.status === "PENDING" ? (
                    <>
                      <form action={markPaid.bind(null, gid, p.id)} className="flex gap-2">
                        <select name="method" className="input flex-1 py-2.5" defaultValue="PIX">
                          {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <SubmitButton className="btn-primary flex-1 py-2.5">Marcar pago</SubmitButton>
                      </form>
                      <WhatsAppButton className="btn-whatsapp btn-sm" label="Cobrar no WhatsApp" phone={p.player.phone} text={chargeText(p.player, p.amountCents, what)} />
                      <form action={cancelPayment.bind(null, gid, p.id)}>
                        <ConfirmButton className="btn-ghost btn-sm w-full text-red-400" message="Cancelar esta cobrança?">Cancelar cobrança</ConfirmButton>
                      </form>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-fg/55">Pago em {p.paidAt ? fmtDate(p.paidAt, tz) : "–"} {p.method ? `· ${METHODS.find(([v]) => v === p.method)?.[1]}` : ""}</p>
                      <form action={markPending.bind(null, gid, p.id)}>
                        <SubmitButton className="btn-ghost btn-sm w-full">Desfazer pagamento</SubmitButton>
                      </form>
                    </>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <details className="card mt-4">
        <summary className="cursor-pointer list-none font-bold">+ Registrar cobrança ou pagamento avulso</summary>
        <div className="mt-4">
          <ActionForm action={createCharge.bind(null, gid)} resetOnSuccess>
            <div>
              <label className="label" htmlFor="playerId">Jogador</label>
              <select className="input" id="playerId" name="playerId" required defaultValue="">
                <option value="" disabled>Escolha</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="amount">Valor (R$)</label>
                <input className="input" id="amount" name="amount" inputMode="decimal" placeholder="15,00" required />
              </div>
              <div>
                <label className="label" htmlFor="dueDate">Vencimento</label>
                <input className="input" id="dueDate" name="dueDate" type="date" defaultValue={utcToZonedInput(new Date(), tz).date} required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="description">Descrição</label>
              <input className="input" id="description" name="description" placeholder="Colete, aluguel extra..." required />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="paid" className="h-5 w-5 accent-accent" /> Já foi pago
            </label>
            <SubmitButton>Salvar</SubmitButton>
          </ActionForm>
        </div>
      </details>
      <p className="mt-4 px-2 text-center text-xs text-fg/40">Pagamento por PIX automático chega numa próxima versão. Por enquanto, registre aqui quando receber.</p>
    </>
  );

  async function MyFinance() {
    const mine = await db.payment.findMany({ where: { playerId: me.id, status: { not: "CANCELED" } }, orderBy: { dueDate: "desc" }, take: 24 });
    const open = mine.filter((p) => p.status === "PENDING");
    const due = open.reduce((s, p) => s + p.amountCents, 0);
    const late = open.some((p) => paymentView(p) === "OVERDUE");
    return (
      <>
        <PageHeader title="Meu financeiro" />
        <div className={`mb-4 rounded-2xl p-5 ${due ? (late ? "bg-red-500 text-white" : "bg-gold text-bg") : "pitch-gradient text-white"}`}>
          <p className="text-sm opacity-75">{due ? (late ? "Você está com pagamento atrasado" : "Você tem pagamento pendente") : "Tudo certo!"}</p>
          <p className="text-4xl font-black tracking-tight">{due ? money(due) : "Em dia"}</p>
          <p className="mt-1 text-sm opacity-75">{me.billingType === "MONTHLY" ? "Mensalista" : "Avulso"}</p>
        </div>
        {mine.length === 0 ? (
          <Empty icon={<Wallet size={26} />} title="Nenhuma cobrança ainda" />
        ) : (
          <div className="card divide-y divide-fg/[0.07] p-0">
            {mine.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{p.type === "MONTHLY" ? `Mensalidade ${monthLabel(p.reference!)}` : p.description ?? "Avulso"}</p>
                  <p className="text-fg/50">Vence {fmtDate(p.dueDate, tz)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{money(p.amountCents)}</span>
                  <FinanceBadge status={paymentView(p)} />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 px-2 text-center text-xs text-fg/45">Pagou? Avise o organizador para ele dar baixa.</p>
      </>
    );
  }
}
