import { Check, CreditCard, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { billingEnabled } from "@/lib/asaas";
import { canStartTrial, hasPendingCheckout, hasPendingTrialCheckout, hasPendingUpgrade, isCardTrial, isPaying, trialAvailable } from "@/lib/billing";
import { fmtDate, money } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { cancelPlan, changePlan, startTrial, subscribe } from "./actions";
import { SubscribeForm } from "./SubscribeForm";

export const metadata = { title: "Planos" };

export default async function Plans({ searchParams }: { searchParams: Promise<{ novo?: string; plano?: string; mudou?: string; cartao?: string }> }) {
  const { novo, plano, mudou, cartao } = await searchParams;
  const focus = plano === "PREMIUM" ? "PREMIUM" : "PRO";
  const user = await requireUser();
  const { sub, plan } = await getUserPlan(user.id);
  const now = new Date();
  const billing = billingEnabled();
  const paying = isPaying(sub);
  const pending = hasPendingCheckout(sub);
  const trialing = sub?.status === "TRIALING" && !!sub.currentPeriodEnd && sub.currentPeriodEnd > now;
  const canceledWithAccess = !!sub?.lastPaymentId && !sub.externalId && plan !== "FREE";
  const pastDue = paying && sub?.status === "PAST_DUE";
  const upgrading = hasPendingUpgrade(sub);
  const cardTrial = trialing && isCardTrial(sub);
  const trialPending = billing && hasPendingTrialCheckout(sub);
  const canTrial = trialAvailable() && canStartTrial(sub);
  const trialCanceled = trialing && !sub!.externalId && !!sub!.customerId && !sub!.checkoutId && !sub!.lastPaymentId;
  const firstCharge = cardTrial ? new Date(sub!.currentPeriodEnd!.getTime() - 3 * 86400_000) : null;

  const subtitle = paying
    ? `Assinatura ${PLANS[plan].name} ativa`
    : trialing
      ? `Teste grátis até ${fmtDate(firstCharge ?? sub!.currentPeriodEnd!)}`
      : novo
        ? "Último passo para criar sua pelada"
        : `Você está no ${PLANS[plan].name}`;

  return (
    <div className="mx-auto max-w-md px-4 pb-12">
      <PageHeader title={novo ? "Escolha seu plano" : "Planos"} back="/app?todas=1" subtitle={subtitle} />

      {billing && (pending || pastDue || upgrading) && sub?.checkoutUrl && (
        <div className={`card mb-3 flex flex-col gap-2 p-4 ring-1 ${pastDue ? "ring-red-400/40" : "ring-gold/40"}`} data-testid="billing-pending">
          <p className="flex items-center gap-2 font-bold">
            <TriangleAlert size={17} className={pastDue ? "text-red-400" : "text-gold"} />
            {pastDue ? "Pagamento em atraso" : upgrading ? `Falta pagar a diferença para o ${PLANS[sub.pendingPlan!].name}` : `Falta pagar o ${PLANS[sub.pendingPlan ?? plan].name}`}
          </p>
          <p className="text-sm text-fg/60">
            {pastDue
              ? `Pague a fatura para não perder o ${PLANS[plan].name}${sub.currentPeriodEnd ? ` depois de ${fmtDate(sub.currentPeriodEnd)}` : ""}.`
              : upgrading
                ? `${money(PLANS[sub.pendingPlan!].priceCents - PLANS[plan].priceCents)} agora para liberar o ${PLANS[sub.pendingPlan!].name}. Depois, ${money(PLANS[sub.pendingPlan!].priceCents)}/mês. Até lá você segue no ${PLANS[plan].name}.`
                : "Pix e cartão confirmam em instantes. Boleto leva até 3 dias úteis."}
          </p>
          <a href={sub.checkoutUrl} className="btn-primary" target="_blank" rel="noopener noreferrer">Pagar agora</a>
          <a href="/app/planos" className="text-center text-sm font-semibold text-fg/60 underline">Já paguei, atualizar</a>
        </div>
      )}

      {trialPending && sub?.checkoutUrl && (
        <div className="card mb-3 flex flex-col gap-2 p-4 ring-1 ring-gold/40" data-testid="trial-pending">
          <p className="flex items-center gap-2 font-bold"><TriangleAlert size={17} className="text-gold" /> Falta cadastrar o cartão</p>
          <p className="text-sm text-fg/60">
            {cartao ? "Recebemos a confirmação do cartão. Se o plano ainda não liberou, atualize em instantes." : `O teste de ${TRIAL_DAYS} dias do ${PLANS[sub.pendingPlan ?? "PRO"].name} começa assim que o cartão for cadastrado. Nada é cobrado no teste.`}
          </p>
          <a href={sub.checkoutUrl} className="btn-primary">Cadastrar cartão</a>
          <a href="/app/planos" className="text-center text-sm font-semibold text-fg/60 underline">Já cadastrei, atualizar</a>
        </div>
      )}

      {cardTrial && (
        <div className="card mb-3 flex flex-col gap-1 p-4" data-testid="trial-active">
          <p className="flex items-center gap-2 font-bold"><CreditCard size={17} className="text-accent" /> Teste grátis do {PLANS[plan].name}</p>
          <p className="text-sm text-fg/60">
            Grátis até {fmtDate(firstCharge!)}. Depois, {money(PLANS[plan].priceCents)}/mês no cartão cadastrado. Cancele antes e nada é cobrado.
          </p>
        </div>
      )}

      {billing && paying && !pastDue && (
        <div className="card mb-3 flex flex-col gap-1 p-4" data-testid="billing-active">
          <p className="flex items-center gap-2 font-bold"><CreditCard size={17} className="text-accent" /> Assinatura ativa</p>
          <p className="text-sm text-fg/60">
            {PLANS[plan].name}, {money(PLANS[plan].priceCents)}/mês{sub?.currentPeriodEnd ? `. Garantido até ${fmtDate(sub.currentPeriodEnd)}` : ""}.
          </p>
          {sub?.checkoutUrl && !upgrading && (
            <a href={sub.checkoutUrl} className="text-sm font-semibold text-accent underline" target="_blank" rel="noopener noreferrer">Ver fatura do mês</a>
          )}
        </div>
      )}

      {mudou && (paying || cardTrial) && mudou === plan && (
        <div className="mb-3 rounded-2xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">Pronto, agora você está no {PLANS[plan].name}. O novo valor vale a partir da {cardTrial ? "primeira" : "próxima"} cobrança.</div>
      )}

      {trialCanceled && (
        <div className="card mb-3 p-4 text-sm text-fg/65" data-testid="trial-canceled">
          Teste cancelado. Nada será cobrado e o {PLANS[plan].name} vale até {fmtDate(sub!.currentPeriodEnd!)}.
        </div>
      )}

      {canceledWithAccess && (
        <div className="card mb-3 p-4 text-sm text-fg/65">
          Assinatura cancelada. Seu {PLANS[plan].name} vale até {fmtDate(sub!.currentPeriodEnd!)} e nada mais será cobrado.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {(focus === "PREMIUM" ? (["PREMIUM", "PRO", "FREE"] as const) : (["PRO", "PREMIUM", "FREE"] as const)).map((k) => {
          const current = plan === k;
          const price = PLANS[k].priceCents;
          return (
            <div key={k} className={`card p-5 ${k === focus ? "ring-2 ring-accent/80" : ""}`} data-testid={`plan-${k}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{PLANS[k].name}</p>
                  <p className="text-sm text-fg/45">{PLANS[k].tagline}</p>
                </div>
                {current ? <span className="chip bg-fg/10 text-fg/70">{trialing ? "Em teste" : "Seu plano"}</span> : k === focus && <span className="chip bg-accent text-bg">Recomendado</span>}
              </div>
              <p className="mt-3 font-display text-5xl font-bold">
                {price ? money(price) : "Grátis"}
                {price > 0 && <span className="ml-1 font-sans text-sm font-medium text-fg/40">/mês</span>}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-fg/70">
                {PLANS[k].features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-accent" /> {f}
                  </li>
                ))}
              </ul>

              {k !== "FREE" && (
                <div className="mt-2">
                  {/* teste grátis com cartão: só quem nunca testou nem assinou */}
                  {canTrial && !trialPending && (
                    <SubscribeForm
                      action={startTrial.bind(null, k)}
                      label={`Testar ${TRIAL_DAYS} dias grátis`}
                      submitLabel="Cadastrar cartão"
                      needsDoc={!sub?.customerId}
                      primary={k === focus}
                    />
                  )}

                  {billing && (paying || cardTrial) && !current && (
                    <ActionForm action={changePlan.bind(null, k)} className="mt-3 flex flex-col gap-2">
                      <SubmitButton className="btn-ghost w-full" pendingText="Mudando...">Mudar para o {PLANS[k].name}</SubmitButton>
                    </ActionForm>
                  )}

                  {billing && !paying && !cardTrial && !(pending && sub?.pendingPlan === k) && (
                    <SubscribeForm
                      action={subscribe.bind(null, k)}
                      label={canTrial ? "Ou assine já, com Pix ou boleto" : `Assinar por ${money(price)}/mês`}
                      needsDoc={!sub?.customerId}
                      primary={!canTrial && (trialing ? current : k === focus)}
                      subtle={canTrial}
                    />
                  )}
                  {!billing && !current && (
                    <button type="button" disabled className="btn-ghost mt-3 w-full opacity-60">Assinatura em breve</button>
                  )}
                  {canTrial && !trialPending && <p className="mt-2 text-center text-xs text-fg/45">Nada é cobrado nos {TRIAL_DAYS} dias. Depois, {money(price)}/mês. Cancele quando quiser.</p>}
                  {billing && trialing && current && !paying && !cardTrial && (
                    <p className="mt-2 text-center text-xs text-fg/45">Assinando agora você não perde os dias de teste que faltam.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {billing && (paying || cardTrial) && (
        <ActionForm action={cancelPlan} className="mt-4 flex flex-col items-center gap-2">
          <ConfirmButton message={cardTrial ? "Cancelar o teste? Nada será cobrado e o plano vale até o fim do teste." : "Cancelar a assinatura? O plano continua valendo até o fim do período pago."} className="text-sm font-semibold text-fg/50 underline">
            {cardTrial ? "Cancelar teste" : "Cancelar assinatura"}
          </ConfirmButton>
        </ActionForm>
      )}

      <p className="mt-4 text-center text-xs leading-relaxed text-fg/40">
        {billing
          ? "Pagamento mensal processado pelo Asaas. Cancele quando quiser."
          : "A assinatura com cartão e Pix chega em breve."}
      </p>
    </div>
  );
}
