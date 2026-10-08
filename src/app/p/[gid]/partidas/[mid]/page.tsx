import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, Check, Clock, Flag, HelpCircle, Lock, MapPin, Pencil, Scale, Shuffle, Unlock, Users, X } from "lucide-react";
import type { Attendance } from "@prisma/client";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";
import { POSITIONS, fmtDayMonth, fmtTime, fmtTimeRange, money, scoreLine, weekdayLong } from "@/lib/format";
import { peerSummaries } from "@/lib/ratings";
import { LOW_CONDUCT, StarBadge, Stars } from "@/components/Stars";
import { ACCESS, FORMATS } from "@/lib/labels";
import { MATCH_STATUS_LABEL, START_EARLY_MIN } from "@/lib/matches";
import { StartMatchButton } from "@/components/StartMatchButton";
import { TEAM_DOT } from "@/lib/teams";
import { ATTENDANCE_LABEL } from "@/lib/attendance";
import { inviteToMatchText, listText, reminderText, resultText, teamsText } from "@/lib/share";
import { playerStrength, teamStrength } from "@/lib/draw";
import { Avatar, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { closeVoting, drawTeams, moveToTeam, remindPending, reopenVoting, respond, startMatch, setListOpen, setPlayerStatus, vote } from "../actions";

const TEAM_COLORS = TEAM_DOT;

type Tab = "presenca" | "times" | "resultado";

export default async function MatchPage({ params, searchParams }: { params: Promise<{ gid: string; mid: string }>; searchParams: Promise<{ aba?: Tab; criada?: string; cobrados?: string; avaliado?: string }> }) {
  const { gid, mid } = await params;
  const sp = await searchParams;
  const { group, isOrganizer, player: me } = await getMembership(gid);
  const match = await db.match.findFirst({
    where: { id: mid, groupId: gid },
    include: {
      teams: { orderBy: { order: "asc" } },
      players: { include: { player: true }, orderBy: [{ queuedAt: "asc" }, { player: { name: "asc" } }] },
      votes: true,
      mvp: true,
    },
  });
  if (!match) notFound();
  const tz = group.timezone;
  // estrelas de cada jogador, só para quem organiza
  const peer = isOrganizer ? await peerSummaries(match.players.map((p) => p.playerId)) : null;
  function OrgStars({ p }: { p: { id: string; skill: number } }) {
    if (!peer) return null;
    const s = peer.get(p.id);
    const conduct = s?.conduct ?? null;
    return (
      <span className="flex shrink-0 gap-1">
        <StarBadge value={s?.quality ?? p.skill / 2} />
        {conduct != null && conduct < LOW_CONDUCT && <StarBadge value={conduct} tone="red" label="conduta" />}
      </span>
    );
  }

  const by = (s: Attendance) => match.players.filter((p) => p.status === s && p.player.active);
  const confirmed = by("CONFIRMED");
  const waitlist = by("WAITLIST");
  const maybe = by("MAYBE");
  const pending = by("PENDING");
  const declined = by("DECLINED");
  const mine = match.players.find((p) => p.playerId === me.id);
  const open = match.status === "SCHEDULED";
  const finished = match.status === "FINISHED";
  const canceled = match.status === "CANCELED";
  const tab: Tab = sp.aba ?? (finished ? "resultado" : match.status === "DRAWN" ? "times" : "presenca");
  const st = MATCH_STATUS_LABEL[match.status];
  const base = `/p/${gid}/partidas/${mid}`;
  const nm = (p: { name: string; nickname: string | null }) => p.nickname || p.name;

  return (
    <>
      {/* Cabeçalho */}
      <div className="pitch-gradient relative mt-2 overflow-hidden rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <Link href={`/p/${gid}/partidas`} className="text-sm font-semibold text-white/60">← Partidas</Link>
          {isOrganizer && !canceled && (
            <Link href={`${base}/editar`} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Editar partida">
              <Pencil size={16} />
            </Link>
          )}
        </div>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-accent">{weekdayLong(match.date, tz)}, {fmtDayMonth(match.date, tz)}</p>
        <p className="text-4xl font-black tracking-tight">{fmtTimeRange(match.date, match.durationMin, tz)}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
          {match.location && <span className="flex items-center gap-1"><MapPin size={14} /> {match.location}</span>}
          <span className="flex items-center gap-1"><Clock size={14} /> {match.durationMin} min</span>
          <span>{FORMATS[match.format].label}</span>
          <span>{ACCESS[match.access].label}</span>
          {match.singleFeeCents > 0 && <span>Avulso {money(match.singleFeeCents)}</span>}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className={`chip ${canceled ? "bg-red-500" : "bg-white/15"}`}>{st.label}</span>
          {!finished && !canceled && (
            <span className="chip bg-white/15"><Users size={12} /> {match.maxPlayers ? `${confirmed.length}/${match.maxPlayers}` : confirmed.length} confirmados</span>
          )}
        </div>
        {match.notes && <p className="mt-3 rounded-2xl bg-black/20 px-3 py-2 text-sm text-white/85">{match.notes}</p>}
      </div>

      {sp.criada && isOrganizer && (
        <div className="card mt-4 bg-accent/10 ring-accent/40">
          <p className="font-bold">Partida criada</p>
          <p className="mb-3 text-sm text-fg/55">Agora mande o link no grupo para a galera confirmar.</p>
          <WhatsAppButton text={inviteToMatchText(match, tz, confirmed.length, match.maxPlayers)} label="Enviar convite no WhatsApp" />
        </div>
      )}

      {isOrganizer && !finished && !canceled && (
        <div className="mt-4">
          <StartMatchButton startsAt={match.date.toISOString()} unlockLabel={fmtTime(new Date(match.date.getTime() - START_EARLY_MIN * 60_000), tz)} started={!!match.startedAt} controlHref={`${base}/controle`} action={startMatch.bind(null, gid, mid)} />
        </div>
      )}

      {/* Você vai jogar? */}
      {open && (
        <div className="card mt-4">
          <p className="text-center text-lg font-extrabold">Você vai jogar?</p>
          {mine?.status === "WAITLIST" && (
            <p className="mt-1 text-center text-sm font-semibold text-gold">
              Você está na lista de espera ({waitlist.findIndex((w) => w.id === mine.id) + 1}º). Se abrir vaga, você entra automaticamente.
            </p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([
              ["CONFIRMED", Check, "Vou", "bg-accent text-bg ring-accent"],
              ["DECLINED", X, "Não vou", "bg-red-500 text-white ring-red-500"],
              ["MAYBE", HelpCircle, "Não sei", "bg-gold text-bg ring-gold"],
            ] as const).map(([s, Icon, label, activeCls]) => {
              const active = mine?.status === s || (s === "CONFIRMED" && mine?.status === "WAITLIST");
              return (
                <form key={s} action={respond.bind(null, gid, mid, s)}>
                  <SubmitButton pendingText="..." className={`btn w-full flex-col gap-0.5 py-3.5 ring-2 ${active ? activeCls : "bg-fg/[0.04] text-fg/70 ring-transparent"}`}>
                    <Icon size={20} strokeWidth={2.4} />
                    <span className="text-sm">{label}</span>
                  </SubmitButton>
                </form>
              );
            })}
          </div>
        </div>
      )}
      {match.status === "CLOSED" && <p className="mt-4 rounded-2xl bg-gold/10 px-4 py-3 text-sm font-medium text-gold">A lista foi fechada. Mudou de ideia? Fale com o organizador.</p>}

      {/* Abas */}
      {!canceled && (
        <div className="sticky top-14 z-10 mt-4 grid grid-cols-3 gap-1 rounded-xl bg-surface/90 p-1 text-sm font-semibold ring-1 ring-fg/[0.07] backdrop-blur">
          {([
            ["presenca", "Presença"],
            ["times", "Times"],
            ["resultado", "Resultado"],
          ] as const).map(([k, l]) => (
            <Link key={k} href={`${base}?aba=${k}`} replace scroll={false} className={`rounded-lg py-2 text-center ${tab === k ? "bg-fg/10 text-fg" : "text-fg/50"}`}>
              {l}
            </Link>
          ))}
        </div>
      )}

      {/* PRESENÇA */}
      {tab === "presenca" && !canceled && (
        <div className="mt-4 flex flex-col gap-4">
          {isOrganizer && !finished && (
            <div className="grid grid-cols-2 gap-2">
              <form action={setListOpen.bind(null, gid, mid, !open)}>
                <SubmitButton className="btn-dark btn-sm w-full">{open ? <><Lock size={16} /> Fechar lista</> : <><Unlock size={16} /> Reabrir lista</>}</SubmitButton>
              </form>
              <form action={remindPending.bind(null, gid, mid)}>
                <SubmitButton className="btn-ghost btn-sm w-full" pendingText="Avisando...">
                  <Bell size={16} /> Lembrar ({pending.length + maybe.length})
                </SubmitButton>
              </form>
            </div>
          )}
          {isOrganizer && !finished && (
            <div className="grid grid-cols-2 gap-2">
              <WhatsAppButton className="btn-whatsapp btn-sm" label="Enviar lista" text={listText(match, tz, { confirmed: confirmed.map((c) => c.player), waitlist: waitlist.map((c) => c.player), pending: [...pending, ...maybe].map((c) => c.player), declined: declined.map((c) => c.player) })} />
              <WhatsAppButton className="btn-whatsapp btn-sm" label="Cobrar resposta" text={reminderText(match, tz, [...pending, ...maybe].map((c) => c.player), confirmed.length)} />
            </div>
          )}

          <AttendanceGroup title={`Confirmados (${confirmed.length}${match.maxPlayers ? `/${match.maxPlayers}` : ""})`} list={confirmed} numbered />
          {waitlist.length > 0 && <AttendanceGroup title={`Lista de espera (${waitlist.length})`} list={waitlist} numbered startAt={match.maxPlayers ?? confirmed.length} />}
          {maybe.length > 0 && <AttendanceGroup title={`Ainda não sabem (${maybe.length})`} list={maybe} />}
          {pending.length > 0 && <AttendanceGroup title={`Pendentes (${pending.length})`} list={pending} />}
          {declined.length > 0 && <AttendanceGroup title={`Ausentes (${declined.length})`} list={declined} />}
        </div>
      )}

      {/* TIMES */}
      {tab === "times" && !canceled && (
        <div className="mt-4 flex flex-col gap-4">
          {isOrganizer && !finished && (
            <div className="card">
              <p className="font-bold">Sortear times</p>
              <p className="mb-3 text-sm text-fg/55">
                {confirmed.length} confirmados em {match.teamsCount} times. O equilibrado usa nível, posição, goleiros e histórico de desempenho.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <form action={drawTeams.bind(null, gid, mid, "BALANCED")}>
                  <SubmitButton className="btn-accent w-full" pendingText="Sorteando..."><Scale size={18} /> Equilibrado</SubmitButton>
                </form>
                <form action={drawTeams.bind(null, gid, mid, "RANDOM")}>
                  <SubmitButton className="btn-ghost w-full" pendingText="Sorteando..."><Shuffle size={18} /> Aleatório</SubmitButton>
                </form>
              </div>
              {match.status === "SCHEDULED" && <p className="mt-2 text-xs text-fg/45">Dica: feche a lista antes de sortear para ninguém entrar depois.</p>}
            </div>
          )}

          {match.teams.length === 0 ? (
            <div className="card py-10 text-center text-fg/50">
              <Shuffle size={28} className="mx-auto text-fg/30" />
              <p className="mt-3 font-semibold">Os times ainda não foram sorteados.</p>
            </div>
          ) : (
            <>
              {match.teams.map((t) => {
                const members = match.players.filter((p) => p.teamId === t.id).sort((a, b) => Number(b.player.position === "GOALKEEPER") - Number(a.player.position === "GOALKEEPER"));
                const strength = teamStrength(members.map((m) => ({ strength: playerStrength(m.player.skill, null, 0, null, 0) })));
                return (
                  <div key={t.id} className="card p-0">
                    <div className="flex items-center gap-2 px-4 pt-4">
                      <span className={`h-4 w-4 rounded-full ${TEAM_COLORS[t.color] ?? "bg-black/20"}`} />
                      <p className="flex-1 font-extrabold uppercase tracking-wide">{t.name}</p>
                      {finished && t.score != null && <span className="text-2xl font-black">{t.score}</span>}
                      {isOrganizer && !finished && <Badge>força {strength}</Badge>}
                    </div>
                    <ul className="divide-y divide-fg/[0.07] px-4 pb-2 pt-2">
                      {members.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 py-2">
                          <Avatar name={m.player.name} photo={m.player.photo} size={30} />
                          <span className={`flex-1 truncate font-medium ${m.playerId === me.id ? "text-accent" : ""}`}>{nm(m.player)}</span>
                          <span className="text-xs text-fg/40">{POSITIONS[m.player.position].short}</span>
                          <OrgStars p={m.player} />
                          {isOrganizer && !finished && (
                            <form action={moveToTeam.bind(null, gid, mid, m.id)}>
                              <AutoSubmitSelect name="teamId" defaultValue={t.id} className="rounded-lg bg-fg/[0.06] px-1.5 py-1 text-xs" options={match.teams.map((o) => ({ value: o.id, label: o.name.replace("Time ", "→ ") }))} />
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {(() => {
                const unassigned = confirmed.filter((c) => !c.teamId);
                return unassigned.length > 0 && isOrganizer && !finished ? (
                  <div className="card">
                    <p className="mb-2 font-bold">Sem time ({unassigned.length})</p>
                    {unassigned.map((m) => (
                      <form key={m.id} action={moveToTeam.bind(null, gid, mid, m.id)} className="flex items-center gap-3 py-1.5">
                        <span className="flex-1">{nm(m.player)}</span>
                        <AutoSubmitSelect name="teamId" defaultValue="" className="rounded-lg bg-fg/[0.06] px-2 py-1 text-sm" options={[{ value: "", label: "Escolher time" }, ...match.teams.map((o) => ({ value: o.id, label: o.name }))]} />
                      </form>
                    ))}
                  </div>
                ) : null;
              })()}
              <WhatsAppButton
                label="Enviar times no WhatsApp"
                text={teamsText(match, tz, match.teams.map((t) => ({ name: t.name, players: match.players.filter((p) => p.teamId === t.id).map((p) => p.player) })))}
              />
            </>
          )}
        </div>
      )}

      {/* RESULTADO */}
      {tab === "resultado" && !canceled && (
        <div className="mt-4 flex flex-col gap-4">
          {sp.avaliado && <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">Avaliações enviadas. Obrigado!</p>}
          {sp.cobrados && isOrganizer && (
            <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">{sp.cobrados} cobrança(s) de avulso geradas no Financeiro.</p>
          )}
          {!finished ? (
            <div className="card py-8 text-center">
              <Flag size={28} className="mx-auto text-fg/30" />
              <p className="mt-3 font-semibold text-fg/60">O resultado aparece aqui depois do jogo.</p>
              {isOrganizer && (
                <Link href={`${base}/resultado`} className="btn-primary mt-4">{match.format === "ROTATION" ? "Lançar vitórias, empates e derrotas" : "Registrar resultado"}</Link>
              )}
            </div>
          ) : (
            <ResultView />
          )}
        </div>
      )}
    </>
  );

  function AttendanceGroup({ title, list, numbered, startAt = 0 }: { title: string; list: NonNullable<typeof match>["players"]; numbered?: boolean; startAt?: number }) {
    return (
      <div>
        <p className="section-title">{title}</p>
        <div className="card divide-y divide-fg/[0.07] p-0">
          {list.length === 0 && <p className="px-4 py-3 text-sm text-fg/40">Ninguém ainda.</p>}
          {list.map((mp, i) => (
            <div key={mp.id} className="flex items-center gap-3 px-4 py-2.5">
              {numbered && <span className="w-5 text-right text-sm font-bold text-fg/35">{startAt + i + 1}</span>}
              <Avatar name={mp.player.name} photo={mp.player.photo} size={34} />
              <span className={`flex-1 truncate font-medium ${mp.playerId === me.id ? "text-accent" : ""}`}>
                {nm(mp.player)} {mp.player.position === "GOALKEEPER" && <span className="ml-1 text-xs font-semibold text-fg/40">GOL</span>}
              </span>
              <OrgStars p={mp.player} />
              {isOrganizer && !finished && (
                <form action={setPlayerStatus.bind(null, gid, mid, mp.playerId)}>
                  <AutoSubmitSelect
                    name="status"
                    defaultValue={mp.status}
                    className="rounded-lg bg-fg/[0.06] px-2 py-1 text-xs font-semibold"
                    options={(["CONFIRMED", "MAYBE", "DECLINED", "PENDING", ...(mp.status === "WAITLIST" ? ["WAITLIST"] : [])] as Attendance[]).map((s) => ({ value: s, label: ATTENDANCE_LABEL[s] }))}
                  />
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function ResultView() {
    const m = match!;
    const played = m.players.filter((p) => p.played);
    const scorers = played.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals);
    const assisters = played.filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists);
    const myVote = m.votes.find((v) => v.voterId === me.id);
    const tally = new Map<string, number>();
    m.votes.forEach((v) => tally.set(v.votedId, (tally.get(v.votedId) ?? 0) + 1));
    return (
      <>
        {m.teams.length >= 2 && m.format === "ROTATION" && (() => {
          const pts = (t: (typeof m.teams)[number]) => t.wins * 3 + t.draws;
          const sorted = [...m.teams].sort((a, b) => pts(b) - pts(a));
          return (
            <div className="card p-0">
              <div className="px-4 pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Rodízio</p>
                <p className="font-display text-3xl font-bold uppercase">{scoreLine(m.teams, true)}</p>
                <p className="text-xs text-fg/50">Vitória 3, empate 1, derrota 0.</p>
              </div>
              <table className="mt-3 w-full text-sm">
                <thead className="text-xs text-fg/45">
                  <tr><th className="px-4 py-1 text-left font-semibold">Time</th><th>V</th><th>E</th><th>D</th><th className="pr-4">Pts</th></tr>
                </thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={t.id} className="border-t border-fg/[0.07] text-center">
                      <td className="px-4 py-2 text-left font-semibold"><i className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${TEAM_COLORS[t.color]}`} />{t.name.replace("Time ", "")}</td>
                      <td>{t.wins}</td><td>{t.draws}</td><td>{t.losses}</td><td className="pr-4 font-black">{pts(t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
        {m.teams.length >= 2 && m.format !== "ROTATION" && (
          <div className="card">
            <div className="flex items-center justify-around text-center">
              {m.teams.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  {i > 0 && <span className="mr-3 text-xl font-bold text-fg/25">×</span>}
                  <div>
                    <span className={`mx-auto mb-1 block h-3 w-3 rounded-full ${TEAM_COLORS[t.color]}`} />
                    <p className="text-xs font-bold uppercase text-fg/50">{t.name.replace("Time ", "")}</p>
                    <p className="text-4xl font-black">{t.score ?? "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {m.mvp && (
          <div className="card flex items-center gap-4 bg-gradient-to-br from-gold/15 to-surface ring-gold/30">
            <Avatar name={m.mvp.name} photo={m.mvp.photo} size={52} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold">Craque da partida</p>
              <p className="text-xl font-extrabold">{nm(m.mvp)}</p>
            </div>
          </div>
        )}

        {(scorers.length > 0 || assisters.length > 0) && (
          <div className="card grid grid-cols-2 gap-4">
            <div>
              <p className="section-title px-0">Gols</p>
              {scorers.map((s) => <p key={s.id} className="text-sm"><b>{s.goals}</b> {nm(s.player)}</p>)}
              {scorers.length === 0 && <p className="text-sm text-fg/40">–</p>}
            </div>
            <div>
              <p className="section-title px-0">Assistências</p>
              {assisters.map((s) => <p key={s.id} className="text-sm"><b>{s.assists}</b> {nm(s.player)}</p>)}
              {assisters.length === 0 && <p className="text-sm text-fg/40">–</p>}
            </div>
          </div>
        )}

        {m.votingOpen && (
          <div className="card">
            <p className="text-lg font-extrabold">Vote no craque da partida</p>
            <p className="mb-3 text-sm text-fg/50">{myVote ? "Voto registrado! Pode trocar até a votação fechar." : "Um voto por pessoa."} {m.votes.length} voto(s) até agora.</p>
            <div className="grid grid-cols-2 gap-2">
              {played.filter((p) => p.playerId !== me.id).map((p) => (
                <form key={p.id} action={vote.bind(null, gid, mid, p.playerId)}>
                  <SubmitButton pendingText="..." className={`btn w-full justify-start px-3 py-2 text-sm ${myVote?.votedId === p.playerId ? "bg-gold text-bg" : "bg-fg/[0.04]"}`}>
                    <Avatar name={p.player.name} photo={p.player.photo} size={26} />
                    <span className="truncate">{nm(p.player)}</span>
                  </SubmitButton>
                </form>
              ))}
            </div>
            {isOrganizer && (
              <form action={closeVoting.bind(null, gid, mid)} className="mt-3">
                <SubmitButton className="btn-dark w-full" pendingText="Apurando...">Encerrar votação e revelar craque</SubmitButton>
              </form>
            )}
          </div>
        )}

        {played.length > 0 && (
          <div>
            <p className="section-title">Atuações</p>
            <div className="card divide-y divide-fg/[0.07] p-0">
              {[...played].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Avatar name={p.player.name} photo={p.player.photo} size={30} />
                  <span className="flex-1 truncate font-medium">{nm(p.player)}</span>
                  {p.goals > 0 && <span className="text-fg/60"><b className="text-fg">{p.goals}</b> G</span>}
                  {p.assists > 0 && <span className="text-fg/60"><b className="text-fg">{p.assists}</b> A</span>}
                  {p.saves > 0 && <span className="text-fg/60"><b className="text-fg">{p.saves}</b> D</span>}
                  {p.yellowCards > 0 && <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-yellow-400" title={`${p.yellowCards} amarelo(s)`} />}
                  {p.redCards > 0 && <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-red-500" title="vermelho" />}
                  {tally.get(p.playerId) && m.votingOpen ? <Badge tone="amber">{tally.get(p.playerId)} voto(s)</Badge> : null}
                  {p.rating != null && <Stars value={p.rating / 2} size={12} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {played.some((p) => p.playerId === me.id) && played.length > 1 && (
          <div className="card bg-accent/[0.06] ring-accent/30">
            <p className="font-extrabold">Como foi a galera em campo?</p>
            <p className="mb-3 text-sm text-fg/55">Avalie a qualidade e a conduta de quem jogou com você. É anônimo e vai para o perfil de cada um.</p>
            <Link href={`${base}/avaliar`} className="btn-primary w-full">{sp.avaliado ? "Revisar minhas avaliações" : "Avaliar jogadores"}</Link>
          </div>
        )}

        <WhatsAppButton
          label="Enviar resultado no WhatsApp"
          text={resultText(m, tz, m.teams, scorers.map((s) => ({ p: s.player, goals: s.goals })), m.mvp, m.format === "ROTATION")}
        />
        {isOrganizer && (
          <div className="grid grid-cols-2 gap-2">
            <Link href={`${base}/resultado`} className="btn-ghost btn-sm">Editar resultado</Link>
            {!m.votingOpen && (
              <form action={reopenVoting.bind(null, gid, mid)}>
                <SubmitButton className="btn-ghost btn-sm w-full">Reabrir votação</SubmitButton>
              </form>
            )}
          </div>
        )}
      </>
    );
  }
}
