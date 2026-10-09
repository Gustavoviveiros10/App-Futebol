export const DEFAULT_TZ = "America/Sao_Paulo";

export function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "25,50" | "25.50" | "25" -> 2550 */
export function parseMoney(input: string | null | undefined): number {
  if (!input) return 0;
  const clean = String(input).replace(/[^\d,.-]/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour,
    minute: +p.minute,
    second: +p.second,
  };
}

/** Converte "2026-10-08" + "20:00" no fuso `tz` para um Date (UTC). */
export function zonedToUtc(dateStr: string, timeStr: string, tz = DEFAULT_TZ): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "00:00").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const p = parts(new Date(guess), tz);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = asIfUtc - guess;
  return new Date(guess - offset);
}

/** Data no fuso: { date: "2026-10-08", time: "20:00" } (para preencher inputs). */
export function utcToZonedInput(date: Date, tz = DEFAULT_TZ) {
  const p = parts(date, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

/** "2026-10" no fuso */
export function monthKey(date: Date, tz = DEFAULT_TZ) {
  const p = parts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function weekdayLong(date: Date, tz = DEFAULT_TZ) {
  const s = date.toLocaleDateString("pt-BR", { weekday: "long", timeZone: tz });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDate(date: Date, tz = DEFAULT_TZ) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: tz });
}

export function fmtDayMonth(date: Date, tz = DEFAULT_TZ) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: tz }).replace(".", "");
}

export function fmtTime(date: Date, tz = DEFAULT_TZ) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
}

export function fmtRating(n: number | null | undefined) {
  if (n == null) return "–";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const POSITIONS = {
  GOALKEEPER: { label: "Goleiro", short: "GOL", emoji: "🧤" },
  DEFENDER: { label: "Zagueiro", short: "ZAG", emoji: "🛡️" },
  FULLBACK: { label: "Lateral", short: "LAT", emoji: "↔️" },
  MIDFIELDER: { label: "Meio-campo", short: "MEI", emoji: "🎯" },
  FORWARD: { label: "Atacante", short: "ATA", emoji: "⚽" },
} as const;

export type PositionKey = keyof typeof POSITIONS;

/** "20:00" + 60 -> "21:00" (passa da meia-noite normalmente) */
export function addToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const t = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Minutos entre início e término; término antes do início = dia seguinte. */
export function minutesBetween(start: string, end: string) {
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  const d = h2 * 60 + m2 - (h1 * 60 + m1);
  return d <= 0 ? d + 1440 : d;
}

/** "20:00 às 21:00" */
export function fmtTimeRange(date: Date, durationMin: number, tz = DEFAULT_TZ) {
  return `${fmtTime(date, tz)} às ${fmtTime(new Date(date.getTime() + durationMin * 60_000), tz)}`;
}

/** Nota guardada de 1 a 10 -> estrelas de 0,5 a 5. */
export function toStars(rating: number | null | undefined) {
  return rating == null ? null : rating / 2;
}

/** "4,3" */
export function fmtStars(stars: number | null | undefined) {
  if (stars == null) return "–";
  return stars.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

type ScoreTeam = { name: string; score: number | null; wins?: number; draws?: number };

/** Placar no formato "Azul 1 × 0 Amarelo"; no rodízio, quem somou mais pontos. */
export function scoreLine(teams: ScoreTeam[], rotation = false) {
  const short = (n: string) => n.replace(/^Time /, "");
  if (rotation) {
    const pts = (t: ScoreTeam) => (t.wins ?? 0) * 3 + (t.draws ?? 0);
    const top = [...teams].sort((a, b) => pts(b) - pts(a))[0];
    return top && pts(top) > 0 ? `${short(top.name)} campeão · ${pts(top)} pts` : "Rodízio";
  }
  if (teams.length === 2) {
    const [a, b] = teams;
    return `${short(a.name)} ${a.score ?? "-"} × ${b.score ?? "-"} ${short(b.name)}`;
  }
  return teams.map((t) => `${short(t.name)} ${t.score ?? "-"}`).join(" · ");
}
