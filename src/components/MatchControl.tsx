"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";

type Team = { id: string; name: string; dot: string };
type Row = { w: number; d: number; l: number };
type Saved = { score: Record<string, number>; table: Record<string, Row>; a?: string; b?: string };

const PRESETS = [5, 7, 10, 15];
const short = (n: string) => n.replace(/^Time /, "");
const mmss = (s: number) => `${String(Math.floor(Math.abs(s) / 60)).padStart(2, "0")}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

/** Cronômetro, placar ao vivo (2 times) e tabela do rodízio. Guarda tudo no aparelho até salvar. */
export function MatchControl({ matchId, rotation, teams, initial, save }: {
  matchId: string;
  rotation: boolean;
  teams: Team[];
  initial: Saved;
  save: (rows: { teamId: string; score?: number; w?: number; d?: number; l?: number }[]) => Promise<void>;
}) {
  const key = `controle:${matchId}`;
  const [state, setState] = useState<Saved>(initial);
  const [loaded, setLoaded] = useState(false);
  const [pending, start] = useTransition();

  // cronômetro
  const [preset, setPreset] = useState(10);
  const [left, setLeft] = useState(600);
  const [running, setRunning] = useState(false);
  const buzzed = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {}
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [state, loaded, key]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (left === 0 && running && !buzzed.current) {
      buzzed.current = true;
      try {
        navigator.vibrate?.([400, 150, 400, 150, 600]);
      } catch {}
    }
  }, [left, running]);

  const reset = (min = preset) => {
    setRunning(false);
    setLeft(min * 60);
    buzzed.current = false;
  };

  const a = state.a ?? teams[0]?.id;
  const b = state.b ?? teams[1]?.id;
  const name = (id?: string) => short(teams.find((t) => t.id === id)?.name ?? "");
  const goal = (id: string, d: number) => setState((s) => ({ ...s, score: { ...s.score, [id]: Math.max(0, (s.score[id] ?? 0) + d) } }));
  const row = (id: string) => state.table[id] ?? { w: 0, d: 0, l: 0 };
  const [history, setHistory] = useState<Record<string, Row>[]>([]);
  const result = (r: "a" | "b" | "e") => {
    if (a && b && a !== b) setHistory((h) => [...h, state.table]);
    setState((s) => {
      if (!a || !b || a === b) return s;
      const t = { ...s.table, [a]: { ...row(a) }, [b]: { ...row(b) } };
      if (r === "e") (t[a].d++, t[b].d++);
      else if (r === "a") (t[a].w++, t[b].l++);
      else (t[b].w++, t[a].l++);
      return { ...s, table: t };
    });
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setState((s) => ({ ...s, table: prev }));
  };
  const pts = (r: Row) => r.w * 3 + r.d;

  const finish = () =>
    start(async () => {
      const rows = rotation
        ? teams.map((t) => ({ teamId: t.id, ...row(t.id) }))
        : [a, b].filter(Boolean).map((id) => ({ teamId: id!, score: state.score[id!] ?? 0 }));
      await save(rows);
      try {
        localStorage.removeItem(key);
      } catch {}
    });

  return (
    <div className="flex flex-col gap-4">
      {/* Cronômetro */}
      <div className="card text-center">
        <p className={`font-display text-7xl font-bold tabular-nums ${left < 0 ? "text-gold" : left <= 30 && running ? "text-red-400" : ""}`}>
          {left < 0 ? "+" : ""}
          {mmss(left)}
        </p>
        {left < 0 && <p className="text-xs font-semibold text-gold">Acréscimo</p>}
        <div className="mt-3 flex justify-center gap-1.5">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setPreset(m);
                reset(m);
              }}
              aria-pressed={preset === m}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${preset === m ? "bg-accent text-bg" : "bg-fg/[0.06] text-fg/70"}`}
            >
              {m} min
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary" onClick={() => setRunning((r) => !r)}>
            {running ? <><Pause size={18} /> Pausar</> : <><Play size={18} /> {left === preset * 60 ? "Iniciar" : "Continuar"}</>}
          </button>
          <button type="button" className="btn-ghost" onClick={() => reset()}>
            <RotateCcw size={18} /> Zerar
          </button>
        </div>
      </div>

      {teams.length < 2 ? (
        <p className="rounded-2xl bg-gold/10 px-4 py-3 text-sm text-gold">Sorteie os times para marcar o placar aqui.</p>
      ) : !rotation ? (
        <>
          <div className="card flex items-center justify-around">
            {[a!, b!].map((id, i) => (
              <div key={id} className="flex items-center gap-4">
                {i > 0 && <span className="text-2xl font-bold text-fg/25">×</span>}
                <div className="flex flex-col items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-fg/60">
                    <i className={`h-2.5 w-2.5 rounded-full ${teams.find((t) => t.id === id)?.dot}`} /> {name(id)}
                  </span>
                  <span className="font-display text-6xl font-bold tabular-nums">{state.score[id] ?? 0}</span>
                  <div className="flex gap-2">
                    <button type="button" aria-label={`Tirar gol do ${name(id)}`} onClick={() => goal(id, -1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-fg/[0.06]">
                      <Minus size={18} />
                    </button>
                    <button type="button" aria-label={`Gol do ${name(id)}`} onClick={() => goal(id, 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-bg">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-primary w-full py-4" disabled={pending} onClick={finish}>
            {pending ? "Salvando..." : "Encerrar e salvar resultado"}
          </button>
        </>
      ) : (
        <>
          <div className="card">
            <p className="section-title px-0">Jogo agora</p>
            <div className="flex items-center gap-2">
              <select className="input" value={a} onChange={(e) => setState((s) => ({ ...s, a: e.target.value }))} aria-label="Primeiro time">
                {teams.map((t) => <option key={t.id} value={t.id}>{short(t.name)}</option>)}
              </select>
              <span className="font-bold text-fg/30">×</span>
              <select className="input" value={b} onChange={(e) => setState((s) => ({ ...s, b: e.target.value }))} aria-label="Segundo time">
                {teams.map((t) => <option key={t.id} value={t.id}>{short(t.name)}</option>)}
              </select>
            </div>
            {a === b && <p className="mt-2 text-xs text-red-400">Escolha dois times diferentes.</p>}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" className="btn-ghost px-2 text-sm" onClick={() => result("a")}>Vitória {name(a)}</button>
              <button type="button" className="btn-ghost px-2 text-sm" onClick={() => result("e")}>Empate</button>
              <button type="button" className="btn-ghost px-2 text-sm" onClick={() => result("b")}>Vitória {name(b)}</button>
            </div>
          </div>
          <div className="card p-0">
            <p className="section-title px-4 pt-4">Tabela ao vivo</p>
            <table className="w-full text-sm">
              <thead className="text-xs text-fg/45">
                <tr><th className="px-4 py-1 text-left font-semibold">Time</th><th>V</th><th>E</th><th>D</th><th className="pr-4">Pts</th></tr>
              </thead>
              <tbody>
                {[...teams].sort((x, y) => pts(row(y.id)) - pts(row(x.id))).map((t) => (
                  <tr key={t.id} className="border-t border-fg/[0.07] text-center">
                    <td className="px-4 py-2 text-left font-semibold"><i className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${t.dot}`} />{short(t.name)}</td>
                    <td>{row(t.id).w}</td><td>{row(t.id).d}</td><td>{row(t.id).l}</td><td className="pr-4 font-black">{pts(row(t.id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length > 0 && (
              <button type="button" className="w-full border-t border-fg/[0.07] py-2.5 text-xs font-semibold text-fg/55" onClick={undo}>
                Desfazer último resultado
              </button>
            )}
          </div>
          <button type="button" className="btn-primary w-full py-4" disabled={pending} onClick={finish}>
            {pending ? "Salvando..." : "Encerrar rodada"}
          </button>
        </>
      )}
    </div>
  );
}
