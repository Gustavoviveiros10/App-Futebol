import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { initials } from "@/lib/format";

const AVATAR_COLORS = ["bg-emerald-700", "bg-sky-700", "bg-amber-700", "bg-rose-700", "bg-violet-700", "bg-teal-700", "bg-orange-700", "bg-zinc-600"];

export function Avatar({ name, photo, size = 40, className = "" }: { name: string; photo?: string | null; size?: number; className?: string }) {
  const color = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (photo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  return (
    <span style={style} className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${color} ${className}`}>
      {initials(name)}
    </span>
  );
}

export function PageHeader({ title, back, action, subtitle }: { title: string; back?: string; action?: React.ReactNode; subtitle?: string }) {
  return (
    <header className="mb-4 flex items-center gap-2 pt-2">
      {back && (
        <Link href={back} aria-label="Voltar" className="-ml-2 rounded-full p-2 text-fg/60 hover:bg-fg/[0.06]">
          <ChevronLeft size={24} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-4xl">{title}</h1>
        {subtitle && <p className="truncate text-sm text-fg/50">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({ icon, title, text, children }: { icon: React.ReactNode; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-fg/[0.05] text-fg/40 ring-1 ring-fg/[0.07]">{icon}</div>
      <p className="text-lg font-bold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-fg/55">{text}</p>}
      {children && <div className="mt-5 flex w-full flex-col gap-2">{children}</div>}
    </div>
  );
}

const TONES = {
  green: "bg-accent/10 text-accent",
  red: "bg-red-500/15 text-red-400",
  amber: "bg-gold/15 text-gold",
  gray: "bg-fg/[0.06] text-fg/60",
  blue: "bg-sky-400/15 text-sky-300",
  dark: "bg-fg text-bg",
} as const;

export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`chip ${TONES[tone]}`}>{children}</span>;
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "green" | "red" | "amber" }) {
  const color = tone === "green" ? "text-accent" : tone === "red" ? "text-red-400" : tone === "amber" ? "text-gold" : "";
  return (
    <div className="rounded-xl bg-fg/[0.04] p-3 ring-1 ring-fg/[0.05]">
      <div className={`text-xl font-extrabold tracking-tight ${color}`}>{value}</div>
      <div className="text-xs font-medium text-fg/50">{label}</div>
    </div>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-400">{msg}</p>;
}
