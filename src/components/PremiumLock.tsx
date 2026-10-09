import Link from "next/link";
import { Lock } from "lucide-react";

/** Recurso do Premium: mostra o que é e chama para assinar (só o dono assina). */
export function PremiumLock({ title, text, isOwner, className = "" }: { title: string; text: string; isOwner: boolean; className?: string }) {
  return (
    <div className={`card flex flex-col gap-2 ring-gold/30 ${className}`} data-testid="premium-lock">
      <p className="flex items-center gap-2 font-extrabold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-gold"><Lock size={14} /></span>
        {title}
        <span className="chip ml-auto bg-gold/15 text-gold">Premium</span>
      </p>
      <p className="text-sm text-fg/55">{text}</p>
      {isOwner ? (
        <Link href="/app/planos" className="btn-primary">Conhecer o Premium</Link>
      ) : (
        <p className="text-xs text-fg/45">Fale com o dono da pelada para liberar.</p>
      )}
    </div>
  );
}
