import "server-only";

/**
 * Cliente mínimo da API v3 do Asaas.
 * Variáveis (na Vercel): ASAAS_API_KEY, ASAAS_ENV ("sandbox" | "production"), ASAAS_WEBHOOK_TOKEN.
 */
const env = process.env;

export function billingEnabled() {
  return !!env.ASAAS_API_KEY?.trim();
}

function baseUrl() {
  if (env.ASAAS_API_URL) return env.ASAAS_API_URL; // testes locais
  return env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export class AsaasError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function call<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const key = env.ASAAS_API_KEY?.trim();
  if (!key) throw new AsaasError("Pagamento não configurado.", 0);
  const res = await fetch(baseUrl() + path, {
    method,
    headers: { "Content-Type": "application/json", "User-Agent": "JogusConnect", access_token: key },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { errors?: { description?: string }[] }).errors?.map((e) => e.description).filter(Boolean).join(" ");
    throw new AsaasError(msg || `Asaas respondeu ${res.status}.`, res.status);
  }
  return data as T;
}

export type AsaasPayment = {
  id: string;
  subscription?: string | null;
  customer: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  status: string;
  invoiceUrl?: string;
  externalReference?: string | null;
};

export function createCustomer(c: { name: string; email: string; cpfCnpj: string; userId: string }) {
  return call<{ id: string }>("POST", "/customers", { name: c.name, email: c.email, cpfCnpj: c.cpfCnpj, externalReference: c.userId });
}

export function createSubscription(s: { customer: string; valueCents: number; description: string; userId: string; plan: string }) {
  return call<{ id: string }>("POST", "/subscriptions", {
    customer: s.customer,
    billingType: "UNDEFINED", // a pessoa escolhe Pix, cartão ou boleto na fatura
    cycle: "MONTHLY",
    value: s.valueCents / 100,
    nextDueDate: today(),
    description: s.description,
    externalReference: `${s.userId}:${s.plan}`,
  });
}

export function updateSubscriptionValue(id: string, valueCents: number, description: string) {
  return call("POST", `/subscriptions/${id}`, { value: valueCents / 100, description, updatePendingPayments: true });
}

export function cancelSubscription(id: string) {
  return call("DELETE", `/subscriptions/${id}`);
}

export async function firstOpenPayment(subscriptionId: string) {
  const r = await call<{ data: AsaasPayment[] }>("GET", `/subscriptions/${subscriptionId}/payments`);
  return r.data.find((p) => p.status === "PENDING" || p.status === "OVERDUE") ?? r.data[0] ?? null;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Só dígitos; valida CPF (11) ou CNPJ (14) pelos dígitos verificadores. */
export function cleanCpfCnpj(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(d)) return null;
  if (d.length === 11) {
    const dv = (n: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
      const r = (s * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]) ? d : null;
  }
  if (d.length === 14) {
    const dv = (n: number) => {
      const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const s = w.reduce((a, x, i) => a + x * Number(d[i]), 0);
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return dv(12) === Number(d[12]) && dv(13) === Number(d[13]) ? d : null;
  }
  return null;
}
