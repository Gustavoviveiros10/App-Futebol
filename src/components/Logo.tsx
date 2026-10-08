/* eslint-disable @next/next/no-img-element */
import { APP_NAME } from "@/lib/actions";

/** Símbolo do Jogus Connect (jogador com a bola). */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <img src="/brand/mark.png" width={size} height={size} alt="" aria-hidden className={`shrink-0 ${className}`} />;
}

/** Cabeçalho: símbolo + nome, no estilo do logo ("JO" em verde-limão). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label={APP_NAME}>
      <LogoMark size={34} />
      <span className="flex flex-col leading-none" aria-hidden>
        <span className="font-display text-xl font-bold uppercase tracking-[0.04em]">
          <span className="text-accent">Jo</span>gus
        </span>
        <span className="text-[8px] font-semibold uppercase tracking-[0.42em] text-fg/70">Connect</span>
      </span>
    </span>
  );
}

/** Logo completo, para telas de entrada (landing, login, convite). */
export function LogoFull({ width = 200, className = "" }: { width?: number; className?: string }) {
  return <img src="/brand/logo.png" width={width} height={Math.round((width * 805) / 1086)} alt={APP_NAME} className={className} />;
}
