import { centsToInput } from "@/lib/format";

type V = { date: string; time: string; location?: string | null; durationMin?: number; singleFeeCents?: number; maxPlayers?: number | null; teamsCount?: number; notes?: string | null };

export function MatchFields({ v }: { v: V }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="date">Data</label>
          <input className="input" id="date" name="date" type="date" defaultValue={v.date} required />
        </div>
        <div>
          <label className="label" htmlFor="time">Horário</label>
          <input className="input" id="time" name="time" type="time" defaultValue={v.time} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="location">Local</label>
        <input className="input" id="location" name="location" defaultValue={v.location ?? ""} placeholder="Arena X" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="durationMin">Duração (min)</label>
          <input className="input" id="durationMin" name="durationMin" type="number" inputMode="numeric" min={10} defaultValue={v.durationMin ?? 60} />
        </div>
        <div>
          <label className="label" htmlFor="singleFee">Valor avulso (R$)</label>
          <input className="input" id="singleFee" name="singleFee" inputMode="decimal" defaultValue={centsToInput(v.singleFeeCents ?? 0)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="maxPlayers">Nº de jogadores</label>
          <input className="input" id="maxPlayers" name="maxPlayers" type="number" inputMode="numeric" min={2} placeholder="Sem limite" defaultValue={v.maxPlayers ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="teamsCount">Times</label>
          <select className="input" id="teamsCount" name="teamsCount" defaultValue={v.teamsCount ?? 2}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} times</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Recado (opcional)</label>
        <textarea className="input min-h-20" id="notes" name="notes" defaultValue={v.notes ?? ""} placeholder="Levar colete, chegar 10 min antes..." />
      </div>
    </>
  );
}
