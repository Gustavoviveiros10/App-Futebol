"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Attendance } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMember, requireOrganizer } from "@/lib/tenancy";
import { fmtTime, parseMoney, weekdayLong, zonedToUtc } from "@/lib/format";
import { START_EARLY_MIN, canStart, matchSchema } from "@/lib/matches";
import { formObject, newInviteCode } from "@/lib/validation";
import { type ActionState, zodError } from "@/lib/actions";
import { fillOpenSpots, setAttendance } from "@/lib/attendance";
import { notifyGroup, notifyPlayers } from "@/lib/notify";
import { TEAM_PRESETS, drawTeams as runDraw, playerStrength, type DrawMode } from "@/lib/draw";
import { groupStats } from "@/lib/stats";
import { chargeMatchPlayers } from "@/lib/finance";
import { ALL_TAGS } from "@/lib/ratings";

const attendance = z.enum(["CONFIRMED", "DECLINED", "MAYBE", "PENDING", "WAITLIST"]);

async function getMatch(gid: string, mid: string) {
  const match = await db.match.findFirst({ where: { id: mid, groupId: gid } });
  if (!match) throw new Error("Partida não encontrada.");
  return match;
}

function refresh(gid: string) {
  revalidatePath(`/p/${gid}`, "layout");
}

export async function createMatch(gid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { group, user } = await requireOrganizer(gid);
  const parsed = matchSchema.safeParse(formObject(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const d = parsed.data;
  const date = zonedToUtc(d.date, d.time, group.timezone);
  const [season, players] = await Promise.all([
    db.season.findFirst({ where: { groupId: gid, active: true }, orderBy: { startsAt: "desc" } }),
    db.player.findMany({ where: { groupId: gid, active: true }, select: { id: true } }),
  ]);
  const match = await db.match.create({
    data: {
      groupId: gid,
      seasonId: season?.id,
      date,
      location: d.location ?? group.location,
      durationMin: d.durationMin,
      singleFeeCents: d.singleFee != null ? parseMoney(d.singleFee) : group.singleFeeCents,
      maxPlayers: d.maxPlayers ?? null,
      teamsCount: d.teamsCount,
      notes: d.notes,
      format: d.format,
      access: d.access,
      shareCode: newInviteCode(),
      players: { create: players.map((p) => ({ playerId: p.id })) },
    },
  });
  await notifyGroup(
    gid,
    {
      type: "MATCH_CREATED",
      title: `⚽ Pelada marcada: ${weekdayLong(date, group.timezone)} às ${fmtTime(date, group.timezone)}`,
      body: "Você vai jogar? Confirme sua presença.",
      link: `/p/${gid}/partidas/${match.id}`,
    },
    user.id,
  );
  refresh(gid);
  redirect(`/p/${gid}/partidas/${match.id}?criada=1`);
}

export async function updateMatch(gid: string, mid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { group } = await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  const parsed = matchSchema.safeParse(formObject(form));
  if (!parsed.success) return zodError(parsed.error.issues);
  const d = parsed.data;
  await db.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        date: zonedToUtc(d.date, d.time, group.timezone),
        location: d.location ?? null,
        durationMin: d.durationMin,
        singleFeeCents: parseMoney(d.singleFee),
        maxPlayers: d.maxPlayers ?? null,
        teamsCount: d.teamsCount,
        notes: d.notes ?? null,
        format: d.format,
        access: d.access,
      },
    });
    // se o limite aumentou, a lista de espera sobe
    await fillOpenSpots(tx, match.id, d.maxPlayers ?? null);
  });
  refresh(gid);
  redirect(`/p/${gid}/partidas/${mid}`);
}

export async function cancelMatch(gid: string, mid: string) {
  await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  if (match.status === "FINISHED") throw new Error("Partida já encerrada.");
  await db.match.update({ where: { id: mid }, data: { status: "CANCELED" } });
  const players = await db.matchPlayer.findMany({ where: { matchId: mid, status: { in: ["CONFIRMED", "WAITLIST"] } }, select: { playerId: true } });
  await notifyPlayers(players.map((p) => p.playerId), { groupId: gid, type: "MATCH_CANCELED", title: "❌ A pelada foi cancelada", link: `/p/${gid}/partidas/${mid}` });
  refresh(gid);
  redirect(`/p/${gid}/partidas`);
}

/** Jogador respondendo a própria presença. */
export async function respond(gid: string, mid: string, status: Attendance) {
  const { player } = await requireMember(gid);
  const s = attendance.parse(status);
  const match = await getMatch(gid, mid);
  if (match.status !== "SCHEDULED") throw new Error("A lista desta partida já foi fechada. Fale com o organizador.");
  await setAttendance(mid, player.id, s === "WAITLIST" ? "CONFIRMED" : s);
  refresh(gid);
}

/** Organizador alterando a presença de qualquer jogador. */
export async function setPlayerStatus(gid: string, mid: string, pid: string, form: FormData) {
  await requireOrganizer(gid);
  const s = attendance.parse(form.get("status"));
  const match = await getMatch(gid, mid);
  if (match.status === "FINISHED" || match.status === "CANCELED") throw new Error("Partida encerrada.");
  const player = await db.player.findFirst({ where: { id: pid, groupId: gid } });
  if (!player) throw new Error("Jogador não encontrado.");
  await setAttendance(mid, pid, s);
  refresh(gid);
}

export async function setListOpen(gid: string, mid: string, open: boolean) {
  await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  if (match.status === "FINISHED" || match.status === "CANCELED") throw new Error("Partida encerrada.");
  await db.match.update({ where: { id: mid }, data: { status: open ? "SCHEDULED" : "CLOSED" } });
  refresh(gid);
}

export async function remindPending(gid: string, mid: string) {
  const { group } = await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  const [pending, confirmed] = await Promise.all([
    db.matchPlayer.findMany({ where: { matchId: mid, status: { in: ["PENDING", "MAYBE"] } }, select: { playerId: true } }),
    db.matchPlayer.count({ where: { matchId: mid, status: "CONFIRMED" } }),
  ]);
  await notifyPlayers(pending.map((p) => p.playerId), {
    groupId: gid,
    type: "ATTENDANCE_REMINDER",
    title: `🚨 Pelada ${weekdayLong(match.date, group.timezone).toLowerCase()} às ${fmtTime(match.date, group.timezone)}: ${confirmed} confirmados`,
    body: "Você ainda não confirmou. Vai jogar?",
    link: `/p/${gid}/partidas/${mid}`,
  });
  refresh(gid);
}

export async function drawTeams(gid: string, mid: string, mode: DrawMode) {
  await requireOrganizer(gid);
  const m = z.enum(["BALANCED", "RANDOM"]).parse(mode);
  const match = await getMatch(gid, mid);
  if (match.status === "FINISHED" || match.status === "CANCELED") throw new Error("Partida encerrada.");
  const confirmed = await db.matchPlayer.findMany({ where: { matchId: mid, status: "CONFIRMED" }, include: { player: true } });
  if (confirmed.length < 2) throw new Error("Confirme pelo menos 2 jogadores para sortear.");

  const stats = new Map((await groupStats(gid, "sempre")).map((s) => [s.player.id, s]));
  const pool = confirmed.map((mp) => {
    const s = stats.get(mp.playerId);
    const decided = s ? s.wins + s.draws + s.losses : 0;
    return {
      id: mp.id,
      position: mp.player.position,
      strength: playerStrength(mp.player.skill, s?.avgRating ?? null, s?.ratingCount ?? 0, decided ? (s!.wins + s!.draws * 0.5) / decided : null, decided),
    };
  });
  const k = Math.min(match.teamsCount, Math.max(2, Math.floor(confirmed.length / 2)));
  const teams = runDraw(pool, k, m);

  await db.$transaction(async (tx) => {
    await tx.matchPlayer.updateMany({ where: { matchId: mid }, data: { teamId: null } });
    await tx.team.deleteMany({ where: { matchId: mid } });
    for (let i = 0; i < teams.length; i++) {
      const preset = TEAM_PRESETS[i % TEAM_PRESETS.length];
      const team = await tx.team.create({ data: { matchId: mid, name: preset.name, color: preset.color, order: i } });
      await tx.matchPlayer.updateMany({ where: { id: { in: teams[i].map((p) => p.id) } }, data: { teamId: team.id } });
    }
    await tx.match.update({ where: { id: mid }, data: { status: "DRAWN" } });
  });
  await notifyPlayers(confirmed.map((c) => c.playerId), { groupId: gid, type: "TEAMS_DRAWN", title: "🔥 Os times foram sorteados!", body: "Veja em qual time você caiu.", link: `/p/${gid}/partidas/${mid}?aba=times` });
  refresh(gid);
  redirect(`/p/${gid}/partidas/${mid}?aba=times`);
}

export async function moveToTeam(gid: string, mid: string, mpId: string, form: FormData) {
  await requireOrganizer(gid);
  await getMatch(gid, mid);
  const teamId = String(form.get("teamId") ?? "");
  const team = await db.team.findFirst({ where: { id: teamId, matchId: mid } });
  if (!team) throw new Error("Time inválido.");
  await db.matchPlayer.updateMany({ where: { id: mpId, matchId: mid }, data: { teamId: team.id } });
  refresh(gid);
}

const num = (v: FormDataEntryValue | null, max = 99) => {
  const n = Number.parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
};

export async function saveResult(gid: string, mid: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  if (match.status === "CANCELED") return { error: "Partida cancelada." };
  const [teams, mps] = await Promise.all([
    db.team.findMany({ where: { matchId: mid } }),
    db.matchPlayer.findMany({ where: { matchId: mid } }),
  ]);
  // estrelas de 1 a 5 na tela; no banco a nota continua de 1 a 10
  const ratingOf = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n * 2 : undefined;
  };
  for (const mp of mps) if (ratingOf(form.get(`rating_${mp.id}`)) === undefined) return { error: "Escolha de 1 a 5 estrelas." };

  const wasFinished = match.status === "FINISHED";
  await db.$transaction(async (tx) => {
    for (const t of teams) {
      if (match.format === "ROTATION") {
        await tx.team.update({ where: { id: t.id }, data: { score: null, wins: num(form.get(`w_${t.id}`)), draws: num(form.get(`d_${t.id}`)), losses: num(form.get(`l_${t.id}`)) } });
        continue;
      }
      const raw = form.get(`score_${t.id}`);
      await tx.team.update({ where: { id: t.id }, data: { score: raw === "" || raw == null ? null : num(raw) } });
    }
    for (const mp of mps) {
      const played = form.get(`played_${mp.id}`) === "on";
      await tx.matchPlayer.update({
        where: { id: mp.id },
        data: {
          played,
          goals: played ? num(form.get(`goals_${mp.id}`)) : 0,
          assists: played ? num(form.get(`assists_${mp.id}`)) : 0,
          yellowCards: played ? num(form.get(`yellow_${mp.id}`), 2) : 0,
          redCards: played ? num(form.get(`red_${mp.id}`), 1) : 0,
          saves: played ? num(form.get(`saves_${mp.id}`)) : 0,
          rating: played ? ratingOf(form.get(`rating_${mp.id}`)) ?? null : null,
        },
      });
    }
    await tx.match.update({ where: { id: mid }, data: { status: "FINISHED", votingOpen: wasFinished ? match.votingOpen : true } });
  });
  const charged = await chargeMatchPlayers(mid);
  if (!wasFinished) {
    const played = mps.filter((mp) => form.get(`played_${mp.id}`) === "on").map((mp) => mp.playerId);
    await notifyPlayers(played, { groupId: gid, type: "MATCH_FINISHED", title: "🏆 Resultado lançado! Vote no craque da partida", link: `/p/${gid}/partidas/${mid}?aba=resultado` });
  }
  refresh(gid);
  redirect(`/p/${gid}/partidas/${mid}?aba=resultado${charged ? `&cobrados=${charged}` : ""}`);
}

export async function vote(gid: string, mid: string, votedId: string) {
  const { player } = await requireMember(gid);
  const match = await getMatch(gid, mid);
  if (match.status !== "FINISHED" || !match.votingOpen) throw new Error("A votação está fechada.");
  if (votedId === player.id) throw new Error("Não vale votar em si mesmo 😅");
  const target = await db.matchPlayer.findFirst({ where: { matchId: mid, playerId: votedId, played: true } });
  if (!target) throw new Error("Só dá para votar em quem jogou.");
  await db.vote.upsert({
    where: { matchId_voterId: { matchId: mid, voterId: player.id } },
    create: { matchId: mid, voterId: player.id, votedId },
    update: { votedId },
  });
  refresh(gid);
}

export async function closeVoting(gid: string, mid: string) {
  await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  const [votes, mps] = await Promise.all([
    db.vote.groupBy({ by: ["votedId"], where: { matchId: mid }, _count: { _all: true } }),
    db.matchPlayer.findMany({ where: { matchId: mid, played: true } }),
  ]);
  const byId = new Map(mps.map((m) => [m.playerId, m]));
  const ranked = votes
    .map((v) => ({ id: v.votedId, votes: v._count._all, mp: byId.get(v.votedId) }))
    .sort((a, b) => b.votes - a.votes || (b.mp?.rating ?? 0) - (a.mp?.rating ?? 0) || (b.mp?.goals ?? 0) - (a.mp?.goals ?? 0));
  // sem votos: escolhe pela maior nota
  const fallback = [...mps].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.goals - a.goals)[0];
  const winner = ranked[0]?.id ?? (fallback?.rating != null ? fallback.playerId : null);
  await db.match.update({ where: { id: match.id }, data: { votingOpen: false, mvpPlayerId: winner } });
  if (winner) {
    const w = await db.player.findUnique({ where: { id: winner } });
    await notifyGroup(gid, { type: "MVP", title: `🏆 ${w?.nickname || w?.name} é o craque da partida!`, link: `/p/${gid}/partidas/${mid}?aba=resultado` });
  }
  refresh(gid);
}

export async function reopenVoting(gid: string, mid: string) {
  await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  if (match.status !== "FINISHED") throw new Error("Partida ainda não encerrada.");
  await db.match.update({ where: { id: mid }, data: { votingOpen: true, mvpPlayerId: null } });
  refresh(gid);
}

const peerSchema = z.object({ quality: z.coerce.number().int().min(1).max(5), conduct: z.coerce.number().int().min(1).max(5) });

/** Avaliação anônima dos colegas que jogaram (qualidade, conduta e tags). */
export async function ratePlayers(gid: string, mid: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { player } = await requireMember(gid);
  const match = await getMatch(gid, mid);
  if (match.status !== "FINISHED") return { error: "Só dá para avaliar depois que a partida termina." };
  const me = await db.matchPlayer.findFirst({ where: { matchId: mid, playerId: player.id, played: true } });
  if (!me) return { error: "Só quem jogou pode avaliar os colegas." };
  const others = await db.matchPlayer.findMany({ where: { matchId: mid, played: true, playerId: { not: player.id } }, select: { playerId: true } });
  const rows = others.flatMap(({ playerId }) => {
    const parsed = peerSchema.safeParse({ quality: form.get(`q_${playerId}`), conduct: form.get(`c_${playerId}`) });
    if (!parsed.success) return [];
    const tags = form.getAll(`t_${playerId}`).map(String).filter((t) => ALL_TAGS.includes(t));
    return [{ ratedId: playerId, ...parsed.data, tags }];
  });
  if (!rows.length) return { error: "Dê estrelas de qualidade e conduta para pelo menos um jogador." };
  await db.$transaction(
    rows.map((r) =>
      db.peerRating.upsert({
        where: { matchId_raterId_ratedId: { matchId: mid, raterId: player.id, ratedId: r.ratedId } },
        create: { matchId: mid, raterId: player.id, ...r },
        update: { quality: r.quality, conduct: r.conduct, tags: r.tags },
      }),
    ),
  );
  refresh(gid);
  redirect(`/p/${gid}/partidas/${mid}?aba=resultado&avaliado=${rows.length}`);
}

/** Libera 10 minutos antes do horário e abre o controle da partida. */
export async function startMatch(gid: string, mid: string) {
  await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  if (match.status === "CANCELED" || match.status === "FINISHED") throw new Error("Essa partida já terminou.");
  if (!canStart(match.date)) throw new Error(`Dá para iniciar a partir de ${START_EARLY_MIN} minutos antes do horário.`);
  if (!match.startedAt) await db.match.update({ where: { id: mid }, data: { startedAt: new Date() } });
  refresh(gid);
  redirect(`/p/${gid}/partidas/${mid}/controle`);
}

const liveSchema = z.array(z.object({ teamId: z.string(), score: z.number().int().min(0).max(99).optional(), w: z.number().int().min(0).max(99).optional(), d: z.number().int().min(0).max(99).optional(), l: z.number().int().min(0).max(99).optional() })).max(6);

/** Salva o placar (2 times) ou a tabela do rodízio que veio do controle. */
export async function saveLive(gid: string, mid: string, rows: z.infer<typeof liveSchema>) {
  await requireOrganizer(gid);
  const match = await getMatch(gid, mid);
  const data = liveSchema.parse(rows);
  const teams = await db.team.findMany({ where: { matchId: mid }, select: { id: true } });
  const ids = new Set(teams.map((t) => t.id));
  await db.$transaction(
    data.filter((r) => ids.has(r.teamId)).map((r) =>
      db.team.update({
        where: { id: r.teamId },
        data: match.format === "ROTATION" ? { wins: r.w ?? 0, draws: r.d ?? 0, losses: r.l ?? 0 } : { score: r.score ?? 0 },
      }),
    ),
  );
  refresh(gid);
  redirect(`/p/${gid}/partidas/${mid}/resultado?ao_vivo=1`);
}
