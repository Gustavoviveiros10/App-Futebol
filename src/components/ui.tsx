import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { initials } from "@/lib/format";

const AVATAR_COLORS = ["bg-pitch-600", "bg-sky-600", "bg-amber-500", "bg-rose-500", "bg-violet-600", "bg-teal-600", "bg-orange-500"];

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
        <Link href={back} aria-label="Voltar" className="-ml-2 rounded-full p-2 text-black/60 hover:bg-black/5">
          <ChevronLeft size={24} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-black/50">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({ icon, title, text, children }: { icon: string; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 text-5xl">{icon}</div>
      <p className="text-lg font-bold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-black/55">{text}</p>}
      {children && <div className="mt-5 flex w-full flex-col gap-2">{children}</div>}
    </div>
  );
}

const TONES = {
  green: "bg-pitch-100 text-pitch-800",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-black/5 text-black/60",
  blue: "bg-sky-100 text-sky-800",
  dark: "bg-ink text-white",
} as const;

export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`chip ${TONES[tone]}`}>{children}</span>;
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "green" | "red" | "amber" }) {
  const color = tone === "green" ? "text-pitch-700" : tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "";
  return (
    <div className="rounded-2xl bg-black/[0.035] p-3">
      <div className={`text-xl font-extrabold tracking-tight ${color}`}>{value}</div>
      <div className="text-xs font-medium text-black/50">{label}</div>
    </div>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
}
