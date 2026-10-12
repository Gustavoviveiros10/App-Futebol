import "server-only";
import { db } from "./db";
import { APP_NAME } from "./actions";
import { billingEnabled } from "./asaas";
import { syncFromAsaas } from "./billing";
import { fmtDate, money } from "./format";
import { appUrl, sendMail } from "./mail";
import { PLANS, cycleSuffix, planPrice } from "./plans";
import { inDays, trialEnd, trialNotice } from "./trial";

const DAY = 86400_000;

/** Manda os e-mails de fim do teste do dia: lembrete antes da 1ª cobrança e "o teste acabou". */
export async function sendTrialNotices(now = new Date()) {
  const subs = await db.subscription.findMany({
    where: {
      status: "TRIALING",
      lastPaymentId: null,
      currentPeriodEnd: { gte: new Date(now.getTime() - 8 * DAY), lte: new Date(now.getTime() + 8 * DAY) },
    },
    include: { user: { select: { name: true, email: true } } },
  });
  const result = { lembretes: 0, encerrados: 0, falhas: 0 };
  for (let sub of subs) {
    if (!trialNotice(sub, now)) continue;
    // confere no Asaas antes de avisar: a cobrança pode ter passado sem o webhook chegar
    if (billingEnabled() && (await syncFromAsaas(sub))) {
      const fresh = await db.subscription.findUnique({ where: { id: sub.id } });
      if (!fresh) continue;
      sub = { ...fresh, user: sub.user };
    }
    const notice = trialNotice(sub, now);
    if (!notice) continue;
    const plan = PLANS[sub.plan];
    const first = sub.user.name.split(" ")[0];
    const link = appUrl(`/app/planos?plano=${sub.plan}`);
    let delivered: boolean;
    if (notice === "reminder") {
      const end = trialEnd({ ...sub, currentPeriodEnd: sub.currentPeriodEnd! });
      const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY));
      ({ delivered } = await sendMail(
        sub.user.email,
        `Seu teste grátis do ${plan.name} acaba ${inDays(days)}`,
        `Olá, ${first}!\n\nSeu teste grátis do ${APP_NAME} ${plan.name} termina em ${fmtDate(end)}. A partir daí, a assinatura de ${money(planPrice(sub.plan, sub.cycle))}${cycleSuffix(sub.cycle)} será cobrada no cartão que você cadastrou, e você continua organizando sua pelada sem interrupção.\n\nSe não quiser continuar, cancele antes dessa data e nada será cobrado:\n${link}\n\nEquipe ${APP_NAME}`,
      ));
      if (delivered) await db.subscription.update({ where: { id: sub.id }, data: { trialReminderAt: now } });
      if (delivered) result.lembretes++;
    } else {
      ({ delivered } = await sendMail(
        sub.user.email,
        `Seu teste grátis do ${plan.name} acabou`,
        `Olá, ${first}!\n\nSeu teste grátis do ${APP_NAME} ${plan.name} terminou e sua conta voltou para o plano gratuito. Seus dados continuam salvos.\n\nPara continuar organizando sua pelada com tudo do ${plan.name}, assine por ${money(plan.priceCents)}/mês (ou ${money(plan.yearlyCents)}/ano, com 2 meses grátis):\n${link}\n\nEquipe ${APP_NAME}`,
      ));
      if (delivered) await db.subscription.update({ where: { id: sub.id }, data: { trialEndedAt: now } });
      if (delivered) result.encerrados++;
    }
    if (!delivered) result.falhas++;
  }
  return result;
}
