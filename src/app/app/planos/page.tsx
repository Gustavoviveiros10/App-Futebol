import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";
import { fmtDate, money } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { startTrial } from "../actions";

export const metadata = { title: "Planos" };

export default async function Plans({ searchParams }: { searchParams: Promise<{ novo?: string; plano?: string }> }) {
  const { novo, plano } = await searchParams;
  const focus = plano === "PREMIUM" ? "PREMIUM" : "PRO";
  const user = await requireUser();
  const { sub, plan } = await getUserPlan(user.id);
  const now = new Date();
  const trialing = sub?.status === "TRIALING" && sub.currentPeriodEnd && sub.currentPeriodEnd > now;
  const trialUsed = !!sub?.currentPeriodEnd && sub.currentPeriodEnd <= now;

  return (
    <div className="mx-auto max-w-md px-4 pb-12">
      <PageHeader title={novo ? "Escolha seu plano" : "Planos"} back="/app?todas=1" subtitle={trialing ? `Teste grátis até ${fmtDate(sub!.currentPeriodEnd!)}` : novo ? "Último passo para criar sua pelada" : `Você está no ${PLANS[plan].name}`} />

      <div className="flex flex-col gap-3">
        {(focus === "PREMIUM" ? (["PREMIUM", "PRO", "FREE"] as const) : (["PRO", "PREMIUM", "FREE"] as const)).map((k) => {
          const current = plan === k;
          return (
            <div key={k} className={`card p-5 ${k === focus ? "ring-2 ring-accent/80" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{PLANS[k].name}</p>
                  <p className="text-sm text-fg/45">{PLANS[k].tagline}</p>
                </div>
                {current ? <span className="chip bg-fg/10 text-fg/70">Seu plano</span> : k === focus && <span className="chip bg-accent text-bg">Recomendado</span>}
              </div>
              <p className="mt-3 font-display text-5xl font-bold">
                {PLANS[k].priceCents ? money(PLANS[k].priceCents) : "Grátis"}
                {PLANS[k].priceCents > 0 && <span className="ml-1 font-sans text-sm font-medium text-fg/40">/mês</span>}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-fg/70">
                {PLANS[k].features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-accent" /> {f}
                  </li>
                ))}
              </ul>
              {k !== "FREE" && !current && !trialUsed && (
                <form action={startTrial.bind(null, k)} className="mt-5">
                  <SubmitButton className={`${k === focus ? "btn-primary" : "btn-ghost"} w-full`} pendingText="Ativando...">
                    {trialing ? `Mudar para o ${PLANS[k].name}` : `Testar ${TRIAL_DAYS} dias grátis`}
                  </SubmitButton>
                </form>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-fg/40">
        {trialUsed
          ? "Seu período de teste terminou. A assinatura com cartão e PIX chega em breve."
          : "O teste é grátis e não pede cartão. A assinatura com cartão e PIX chega em breve; nada é cobrado sem você confirmar."}
      </p>
    </div>
  );
}
