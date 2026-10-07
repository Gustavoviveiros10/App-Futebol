import { APP_NAME } from "@/lib/actions";

/** Marca: escudo minimalista com o círculo central do campo. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <path d="M16 5v22" stroke="#08090b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="#08090b" strokeWidth="2" />
      <circle cx="16" cy="16" r="1.6" fill="#08090b" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-bold uppercase tracking-[0.04em]">{APP_NAME}</span>
    </span>
  );
}
