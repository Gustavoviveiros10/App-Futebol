import { NextResponse } from "next/server";
import { applyPaymentEvent, applySubscriptionDeleted } from "@/lib/billing";
import { billingEnabled } from "@/lib/asaas";

export const dynamic = "force-dynamic";

/** Diagnóstico: mostra só se as variáveis chegaram (nunca o valor). */
export async function GET() {
  const key = process.env.ASAAS_API_KEY?.trim() ?? "";
  return NextResponse.json({
    chave: billingEnabled() ? (key.startsWith("$aact_hmlg_") ? "sandbox" : key.startsWith("$aact_") ? "produção" : "formato desconhecido") : "ausente",
    ambiente: process.env.ASAAS_ENV ?? "ausente",
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN ? "ok" : "ausente",
  });
}

/** Webhook do Asaas. Cadastre no painel: URL https://<domínio>/api/asaas com o token de ASAAS_WEBHOOK_TOKEN. */
export async function POST(req: Request) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!token || req.headers.get("asaas-access-token") !== token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const event: string = body?.event ?? "";
  try {
    let result = "ignorado";
    if (body?.payment) result = await applyPaymentEvent(event, body.payment);
    else if (event === "SUBSCRIPTION_DELETED" && body?.subscription?.id) {
      await applySubscriptionDeleted(body.subscription.id);
      result = "assinatura removida";
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("asaas webhook", event, e);
    // 500 faz o Asaas tentar de novo
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
