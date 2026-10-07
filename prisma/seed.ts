/**
 * Dados de demonstração. Uso: npm run db:seed
 * Login organizador: organizador@demo.com / demo1234
 * Login jogador:     jogador@demo.com / demo1234
 */
import { PrismaClient, type Position } from "@prisma/client";
import bcrypt from "bcryptjs";
import { drawTeams, TEAM_PRESETS } from "../src/lib/draw";

const db = new PrismaClient();
const DAY = 86400_000;

const NAMES: [string, string | null, Position, number][] = [
  ["Gustavo Viveiros", "Gus", "MIDFIELDER", 7],
  ["João Silva", "Joãozinho", "FORWARD", 8],
  ["Pedro Santos", null, "MIDFIELDER", 6],
  ["Lucas Oliveira", null, "FORWARD", 9],
  ["Rafael Costa", "Rafa", "DEFENDER", 6],
  ["Bruno Lima", null, "FULLBACK", 5],
  ["Carlos Souza", "Carlão", "GOALKEEPER", 7],
  ["André Pereira", null, "DEFENDER", 7],
  ["Felipe Alves", null, "MIDFIELDER", 5],
  ["Gabriel Rocha", "Gabi", "FORWARD", 7],
  ["Matheus Dias", null, "GOALKEEPER", 6],
  ["Thiago Martins", null, "MIDFIELDER", 8],
  ["Diego Ribeiro", null, "FULLBACK", 6],
  ["Vinícius Gomes", "Vini", "FORWARD", 6],
  ["Leandro Barros", null, "DEFENDER", 5],
  ["Eduardo Nunes", "Dudu", "MIDFIELDER", 4],
  ["Marcelo Teixeira", null, "DEFENDER", 6],
  ["Renato Cardoso", null, "MIDFIELDER", 5],
];

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

async function main() {
  await db.user.deleteMany({ where: { email: { in: ["organizador@demo.com", "jogador@demo.com"] } } });
  const hash = await bcrypt.hash("demo1234", 10);
  const org = await db.user.create({ data: { name: "Gustavo Viveiros", email: "organizador@demo.com", passwordHash: hash } });
  const pla = await db.user.create({ data: { name: "João Silva", email: "jogador@demo.com", passwordHash: hash } });

  const now = new Date();
  const group = await db.group.create({
    data: {
      name: "Pelada dos Amigos",
      location: "Arena X",
      weekday: 3,
      time: "20:00",
      monthlyFeeCents: 10000,
      singleFeeCents: 1500,
      maxPlayers: 20,
      teamsCount: 2,
      inviteCode: "demo" + Math.random().toString(36).slice(2, 8),
      ownerId: org.id,
      subscription: { create: { plan: "PRO", status: "TRIALING", currentPeriodEnd: new Date(now.getTime() + 30 * DAY) } },
      seasons: { create: { name: `Temporada ${now.getFullYear()} — ${now.getMonth() < 6 ? "1º" : "2º"} semestre`, startsAt: new Date(now.getTime() - 120 * DAY) } },
    },
    include: { seasons: true },
  });

  const players = [];
  for (const [i, [name, nickname, position, skill]] of NAMES.entries()) {
    players.push(
      await db.player.create({
        data: {
          groupId: group.id,
          name,
          nickname,
          position,
          skill,
          userId: i === 0 ? org.id : i === 1 ? pla.id : null,
          role: i === 0 ? "ORGANIZER" : "PLAYER",
          billingType: i < 12 ? "MONTHLY" : "PER_MATCH",
          phone: `1199${String(1000000 + i * 7919).slice(0, 7)}`,
          joinedAt: new Date(now.getTime() - (200 - i * 5) * DAY),
        },
      }),
    );
  }

  // 6 partidas passadas, uma por semana
  for (let w = 6; w >= 1; w--) {
    const date = new Date(now.getTime() - w * 7 * DAY);
    date.setUTCHours(23, 0, 0, 0);
    const playing = players.filter(() => rand() > 0.2).slice(0, 16);
    const match = await db.match.create({
      data: { groupId: group.id, seasonId: group.seasons[0].id, date, location: "Arena X", singleFeeCents: 1500, maxPlayers: 20, status: "FINISHED" },
    });
    const teams = drawTeams(playing.map((p) => ({ id: p.id, position: p.position, strength: p.skill })), 2, "BALANCED", rand);
    const scores = [Math.floor(rand() * 7), Math.floor(rand() * 7)];
    let mvp: { id: string; score: number } | null = null;
    for (let t = 0; t < 2; t++) {
      const team = await db.team.create({ data: { matchId: match.id, name: TEAM_PRESETS[t].name, color: TEAM_PRESETS[t].color, order: t, score: scores[t] } });
      let goalsLeft = scores[t];
      for (const p of teams[t]) {
        const pl = players.find((x) => x.id === p.id)!;
        const goals = pl.position === "GOALKEEPER" ? 0 : Math.min(goalsLeft, rand() < pl.skill / 14 ? 1 + Math.floor(rand() * 2) : 0);
        goalsLeft -= goals;
        const rating = Math.round((pl.skill - 1 + rand() * 3 + goals * 0.5) * 10) / 10;
        await db.matchPlayer.create({
          data: {
            matchId: match.id, playerId: p.id, status: "CONFIRMED", respondedAt: date, queuedAt: date, teamId: team.id, played: true,
            goals, assists: rand() < 0.25 ? 1 : 0, saves: pl.position === "GOALKEEPER" ? Math.floor(rand() * 8) : 0,
            yellowCards: rand() < 0.05 ? 1 : 0, rating: Math.min(10, Math.max(1, rating)),
          },
        });
        if (!mvp || rating > mvp.score) mvp = { id: p.id, score: rating };
      }
    }
    await db.match.update({ where: { id: match.id }, data: { mvpPlayerId: mvp!.id } });
    for (const p of playing.filter((p) => p.billingType === "PER_MATCH"))
      await db.payment.create({
        data: { groupId: group.id, playerId: p.id, matchId: match.id, type: "MATCH", description: "Partida avulsa", amountCents: 1500, dueDate: date, status: rand() < 0.8 ? "PAID" : "PENDING", paidAt: date, method: "PIX" },
      });
  }

  // mensalidades: mês passado (quase todos pagos) e mês atual (metade)
  for (const [offset, payRate] of [[-1, 0.85], [0, 0.5]] as const) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 10, 23));
    const key = `${ref.getUTCFullYear()}-${String(ref.getUTCMonth() + 1).padStart(2, "0")}`;
    for (const p of players.filter((p) => p.billingType === "MONTHLY")) {
      const paid = rand() < payRate;
      await db.payment.create({
        data: { groupId: group.id, playerId: p.id, type: "MONTHLY", reference: key, description: "Mensalidade", amountCents: 10000, dueDate: ref, status: paid ? "PAID" : "PENDING", paidAt: paid ? new Date(ref.getTime() - 3 * DAY) : null, method: paid ? "PIX" : null },
      });
    }
  }

  // próxima partida com respostas
  const next = new Date(now.getTime() + 2 * DAY);
  next.setUTCHours(23, 0, 0, 0);
  const statuses = ["CONFIRMED", "CONFIRMED", "CONFIRMED", "DECLINED", "PENDING", "MAYBE"] as const;
  await db.match.create({
    data: {
      groupId: group.id, seasonId: group.seasons[0].id, date: next, location: "Arena X", singleFeeCents: 1500, maxPlayers: 20,
      players: { create: players.map((p, i) => ({ playerId: p.id, status: i === 1 ? "PENDING" : statuses[Math.floor(rand() * statuses.length)], queuedAt: new Date(now.getTime() - (20 - i) * 3600_000), respondedAt: new Date() })) },
    },
  });

  console.log(`Pelada demo criada: ${group.name} (convite /convite/${group.inviteCode})`);
}

main().finally(() => db.$disconnect());
