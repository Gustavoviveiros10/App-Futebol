import type { GameFormat, MatchAccess } from "@prisma/client";
import { addToTime, centsToInput } from "@/lib/format";
import { ACCESS, FORMATS } from "@/lib/labels";
import { Choice } from "./Choice";
import { PlaceField } from "./PlaceField";

type V = { date: string; time: string; location?: string | null; address?: string | null; lat?: number | null; lng?: number | null; durationMin?: number; singleFeeCents?: number; maxPlayers?: number | null; teamsCount?: number; notes?: string | null; format?: GameFormat; access?: MatchAccess };

export function MatchFields({ v }: { v: V }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="date">Data</label>
        <input className="input" id="date" name="date" type="date" defaultValue={v.date} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="time">Início</label>
          <input className="input" id="time" name="time" type="time" defaultValue={v.time} required />
        </div>
        <div>
          <label className="label" htmlFor="endTime">Término</label>
          <input className="input" id="endTime" name="endTime" type="time" defaultValue={addToTime(v.time, v.durationMin ?? 60)} required />
        </div>
      </div>
      <PlaceField v={v} />
      <div>
        <label className="label" htmlFor="singleFee">Valor avulso (R$)</label>
        <input className="input" id="singleFee" name="singleFee" inputMode="decimal" defaultValue={centsToInput(v.singleFeeCents ?? 0)} />
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
      <Choice name="format" legend="Formato" value={v.format ?? "TWO_TEAMS"} options={FORMATS} />
      <Choice name="access" legend="Acesso: quem pode entrar?" value={v.access ?? "RESTRICTED"} options={ACCESS} />
      <div>
        <label className="label" htmlFor="notes">Recado (opcional)</label>
        <textarea className="input min-h-20" id="notes" name="notes" defaultValue={v.notes ?? ""} placeholder="Levar colete, chegar 10 min antes..." />
      </div>
    </>
  );
}
