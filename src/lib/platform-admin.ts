import "server-only";
import { notFound } from "next/navigation";
import { getCurrentUser } from "./auth";

/** E-mails com acesso ao painel /admin (variável ADMIN_EMAILS, separados por vírgula). */
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(email: string | null | undefined) {
  return !!email && adminEmails().includes(email.toLowerCase());
}

/** Dono da plataforma. Para qualquer outra pessoa a página simplesmente não existe. */
export async function requirePlatformAdmin() {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdmin(user.email)) notFound();
  return user;
}
