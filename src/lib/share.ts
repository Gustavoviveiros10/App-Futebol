import { POSITIONS, fmtTime, money, weekdayLong, fmtDayMonth, type PositionKey } from "./format";
import { appUrl } from "./mail";

type M = { id: string; groupId: string; date: Date; location: string | null };
type P = { name: string; nickname: string | null };
const n = (p: P) => p.nickname || p.name;

export function matchLink(m: M) {
  return appUrl(`/p/${m.groupId}/partidas/${m.id}`);
}

function header(m: M, tz: string) {
  return `⚽ *${weekdayLong(m.date, tz)}, ${fmtDayMonth(m.date, tz)} — ${fmtTime(m.date, tz)}*${m.location ? `\n📍 ${m.location}` : ""}`;
}

export function inviteToMatchText(m: M, tz: string, confirmed: number, max: number | null) {
  return `${header(m, tz)}\n\n${max ? `${confirmed}/${max} confirmados` : `${confirmed} confirmados`}. Você vai jogar? Confirma aqui:\n${matchLink(m)}`;
}

export function listText(m: M, tz: string, lists: { confirmed: P[]; waitlist: P[]; pending: P[]; declined: P[] }) {
  const lines = [header(m, tz), ""];
  lines.push(`✅ *Confirmados (${lists.confirmed.length})*`);
  lists.confirmed.forEach((p, i) => lines.push(`${i + 1}. ${n(p)}`));
  if (lists.waitlist.length) {
    lines.push("", `⏳ *Lista de espera*`);
    lists.waitlist.forEach((p, i) => lines.push(`${lists.confirmed.length + i + 1}. ${n(p)}`));
  }
  if (lists.pending.length) lines.push("", `❔ *Não responderam:* ${lists.pending.map(n).join(", ")}`);
  if (lists.declined.length) lines.push("", `❌ *Fora:* ${lists.declined.map(n).join(", ")}`);
  lines.push("", `Confirme pelo app: ${matchLink(m)}`);
  return lines.join("\n");
}

export function reminderText(m: M, tz: string, pending: P[], confirmed: number) {
  return `🚨 ${header(m, tz)}\n\nJá temos ${confirmed} confirmados! Falta responder: ${pending.map(n).join(", ")}.\n\nConfirme aqui 👉 ${matchLink(m)}`;
}

export function teamsText(m: M, tz: string, teams: { name: string; players: (P & { position: PositionKey })[] }[]) {
  const lines = [`🔥 *Times sorteados!*`, header(m, tz)];
  for (const t of teams) {
    lines.push("", `*${t.name.toUpperCase()}*`);
    for (const p of t.players) lines.push(`${p.position === "GOALKEEPER" ? "🧤" : "⚽"} ${n(p)}`);
  }
  return lines.join("\n");
}

export function resultText(m: M, tz: string, teams: { name: string; score: number | null }[], scorers: { p: P; goals: number }[], mvp?: P | null) {
  const lines = [`🏁 *Resultado — ${fmtDayMonth(m.date, tz)}*`, ""];
  lines.push(teams.map((t) => `${t.name} ${t.score ?? 0}`).join(" x "));
  if (scorers.length) {
    lines.push("", "⚽ *Gols*");
    scorers.forEach((s) => lines.push(`${n(s.p)} — ${s.goals}`));
  }
  if (mvp) lines.push("", `🏆 *Craque:* ${n(mvp)}`);
  lines.push("", `Estatísticas completas: ${matchLink(m)}`);
  return lines.join("\n");
}

export function chargeText(p: P, amountCents: number, what: string) {
  return `💰 Fala, ${n(p).split(" ")[0]}! Passando pra lembrar: ${what} de ${money(amountCents)} está em aberto. Quando fizer o pagamento me avisa por aqui. Valeu! ⚽`;
}

export { POSITIONS };
