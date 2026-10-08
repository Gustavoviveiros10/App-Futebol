import "server-only";

/**
 * Envio de e-mail plugável. Sem RESEND_API_KEY, o conteúdo vai para o log
 * do servidor (útil em desenvolvimento).
 */
export async function sendMail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[mail] para=${to} assunto="${subject}"\n${text}`);
    return { delivered: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "Pelada <onboarding@resend.dev>",
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) console.error("[mail] falha ao enviar", res.status, await res.text());
  return { delivered: res.ok };
}

/** Endereço público do app para links (convite, WhatsApp, senha). */
export function appUrl(path = "") {
  const env = process.env;
  const https = (h?: string) => (h ? (/^https?:\/\//.test(h) ? h : `https://${h}`) : undefined);
  // em teste (preview) o link precisa abrir este mesmo deploy, não o de produção, que pode não ter as telas novas
  const base =
    (env.VERCEL_ENV === "preview" ? https(env.VERCEL_BRANCH_URL) : undefined) ??
    https(env.APP_URL?.trim()) ??
    https(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    https(env.VERCEL_URL) ??
    "http://localhost:3000";
  return base.replace(/\/$/, "") + path;
}
