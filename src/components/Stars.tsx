import { fmtStars } from "@/lib/format";

const PATH = "m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9Z";

export function StarIcon({ size = 14, fill = 1, className = "" }: { size?: number; fill?: number; className?: string }) {
  const id = `s${Math.round(fill * 100)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="currentColor" />
          <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path d={PATH} fill={`url(#${id})`} />
    </svg>
  );
}

/** Cinco estrelas (aceita meia estrela). `value` de 0 a 5. */
export function Stars({ value, size = 14, className = "text-gold" }: { value: number | null | undefined; size?: number; className?: string }) {
  const v = Math.round((value ?? 0) * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={value == null ? "Sem avaliação" : `${fmtStars(value)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} fill={v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0} />
      ))}
    </span>
  );
}

/** Selo compacto "★ 4,3". `tone` decide a cor. */
export function StarBadge({ value, tone = "gold", label }: { value: number | null | undefined; tone?: "gold" | "green" | "red"; label?: string }) {
  if (value == null) return null;
  const color = tone === "red" ? "bg-red-500/15 text-red-400" : tone === "green" ? "bg-accent/10 text-accent" : "bg-gold/15 text-gold";
  return (
    <span className={`chip ${color}`} title={label}>
      <StarIcon size={11} /> {fmtStars(value)}
      {label && <span className="font-medium opacity-80">{label}</span>}
    </span>
  );
}

/** Conduta abaixo disso aparece em vermelho para o organizador. */
export const LOW_CONDUCT = 3.5;
