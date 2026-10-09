import { Check, CreditCard, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { billingEnabled } from "@/lib/asaas";
import { hasPendingCheckout, isPaying, syncFromAsaas } from "@/lib/billing";
import { fmtDate, money } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { startTrial } from "../actions";
import { cancelPlan, changePlan, subscribe } from "./actions";
import { SubscribeForm } from "./SubscribeForm";

export const metadata = { title: "Planos" };

export default async function Plans({ searchParams }: { searchParams: Promise<{ novo?: string; plano?: string; mudou?: string }> }) {
  const { novo, plano, mudou } = await searchParams;
  const focus = plano === "PREMIUM" ? "PREMIUM" : "PRO";
  const user = await requireUser();
  let { sub, plan } = await getUserPlan(user.id);
  if (billingEnabled() && (await syncFromAsaas(sub))) ({ sub, plan } = await getUserPlan(user.id));
  const now = new Date();
  const billing = billingEnabled();
  const paying = isPaying(sub);
  const pending = hasPendingCheckout(sub);
  const trialing = sub?.status === "TRIALING" && !!sub.currentPeriodEnd && sub.currentPeriodEnd > now;
  const trialUsed = (!!sub?.currentPeriodEnd && sub.currentPeriodEnd <= now) || !!sub?.lastPaymentId;
  const canceledWithAccess = !!sub?.lastPaymentId && !sub.externalId && plan !== "FREE";
  const pastDue = paying && sub?.status === "PAST_DUE";

  const subtitle = paying
    ? `Assinatura ${PLANS[plan].name} ativa`
    : trialing
      ? `Teste grátis até ${fmtDate(sub!.currentPeriodEnd!)}`
      : novo
        ? "Último passo para criar sua pelada"
        : `Você está no ${PLANS[plan].name}`;

  return (
    <div className="mx-auto max-w-md px-4 pb-12">
      <PageHeader title={novo ? "Escolha seu plano" : "Planos"} back="/app?todas=1" subtitle={subtitle} />

      {billing && (pending || pastDue) && sub?.checkoutUrl && (
        <div className={`card mb-3 flex flex-col gap-2 p-4 ring-1 ${pastDue ? "ring-red-400/40" : "ring-gold/40"}`} data-testid="billing-pending">
          <p className="flex items-center gap-2 font-bold">
            <TriangleAlert size={17} className={pastDue ? "text-red-400" : "text-gold"} />
            {pastDue ? "Pagamento em atraso" : `Falta pagar o ${PLANS[sub.pendingPlan ?? plan].name}`}
          </p>
          <p className="text-sm text-fg/60">
            {pastDue
              ? `Pague a fatura para não perder o ${PLANS[plan].name}${sub.currentPeriodEnd ? ` depois de ${fmtDate(sub.currentPeriodEnd)}` : ""}.`
              : "Pix e cartão confirmam em instantes. Boleto leva até 3 dias úteis."}
          </p>
          <a href={sub.checkoutUrl} className="btn-primary" target="_blank" rel="noopener noreferrer">Pagar agora</a>
          <a href="/app/planos" className="text-center text-sm font-semibold text-fg/60 underline">Já paguei, atualizar</a>
        </div>
      )}

      {billing && paying && !pastDue && (
        <div className="card mb-3 flex flex-col gap-1 p-4" data-testid="billing-active">
          <p className="flex items-center gap-2 font-bold"><CreditCard size={17} className="text-accent" /> Assinatura ativa</p>
          <p className="text-sm text-fg/60">
            {PLANS[plan].name}, {money(PLANS[plan].priceCents)}/mês{sub?.currentPeriodEnd ? `. Garantido até ${fmtDate(sub.currentPeriodEnd)}` : ""}.
          </p>
          {sub?.checkoutUrl && (
            <a href={sub.checkoutUrl} className="text-sm font-semibold text-accent underline" target="_blank" rel="noopener noreferrer">Ver fatura do mês</a>
          )}
        </div>
      )}

      {mudou && paying && mudou === plan && (
        <div className="mb-3 rounded-2xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">Pronto, agora você está no {PLANS[plan].name}. O novo valor vale a partir da próxima cobrança.</div>
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
                  {/* teste grátis: só quem nunca testou nem pagou */}
                  {!current && !trialUsed && !paying && (
                    <form action={startTrial.bind(null, k)} className="mt-3">
                      <SubmitButton className={`${k === focus ? "btn-primary" : "btn-ghost"} w-full`} pendingText="Ativando...">
                        {trialing ? `Testar o ${PLANS[k].name} no lugar` : `Testar ${TRIAL_DAYS} dias grátis`}
                      </SubmitButton>
                    </form>
                  )}

                  {billing && paying && !current && (
                    <ActionForm action={changePlan.bind(null, k)} className="mt-3 flex flex-col gap-2">
                      <SubmitButton className="btn-ghost w-full" pendingText="Mudando...">Mudar para o {PLANS[k].name}</SubmitButton>
                    </ActionForm>
                  )}

                  {billing && !paying && !(pending && sub?.pendingPlan === k) && (
                    <SubscribeForm
                      action={subscribe.bind(null, k)}
                      label={`Assinar por ${money(price)}/mês`}
                      needsDoc={!sub?.customerId}
                      primary={trialing ? current : trialUsed && k === focus}
                    />
                  )}
                  {billing && trialing && current && !paying && (
                    <p className="mt-2 text-center text-xs text-fg/45">Assinando agora você não perde os dias de teste que faltam.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {billing && paying && (
        <ActionForm action={cancelPlan} className="mt-4 flex flex-col items-center gap-2">
          <ConfirmButton message="Cancelar a assinatura? O plano continua valendo até o fim do período pago." className="text-sm font-semibold text-fg/50 underline">
            Cancelar assinatura
          </ConfirmButton>
        </ActionForm>
      )}

      <p className="mt-4 text-center text-xs leading-relaxed text-fg/40">
        {billing
          ? "Pagamento mensal por Pix, cartão ou boleto, processado pelo Asaas. Cancele quando quiser."
          : trialUsed
            ? "Seu período de teste terminou. A assinatura com cartão e PIX chega em breve."
            : "O teste é grátis e não pede cartão. A assinatura com cartão e PIX chega em breve; nada é cobrado sem você confirmar."}
      </p>
    </div>
  );
}
