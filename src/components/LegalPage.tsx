import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const CONTACT_EMAIL = "contato@jogusconnect.com.br";
export const LEGAL_UPDATED = "14 de outubro de 2026";

/** Moldura das páginas de Termos e Privacidade. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-16 pt-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-fg/60"><ArrowLeft size={16} /> Jogus</Link>
      <div>
        <h1 className="text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-fg/50">Atualizado em {LEGAL_UPDATED}.</p>
      </div>
      <div className="legal flex flex-col gap-4 text-sm leading-relaxed text-fg/75 [&_a]:font-semibold [&_a]:text-accent [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </main>
  );
}

/** "Ao continuar, você concorda com os Termos e a Política de Privacidade." */
export function LegalNotice({ action = "continuar", className = "" }: { action?: string; className?: string }) {
  return (
    <p className={`text-center text-xs text-fg/45 ${className}`}>
      Ao {action}, você concorda com os <Link href="/termos" target="_blank" className="underline">Termos de Uso</Link> e a{" "}
      <Link href="/privacidade" target="_blank" className="underline">Política de Privacidade</Link>.
    </p>
  );
}
