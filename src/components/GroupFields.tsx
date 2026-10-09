import type { GameFormat, Level, MatchAccess, Modality } from "@prisma/client";
import { WEEKDAYS, addToTime, centsToInput } from "@/lib/format";
import { ACCESS, FORMATS, LEVELS, MODALITIES } from "@/lib/labels";
import { Choice, Pills } from "./Choice";
import { PlaceField } from "./PlaceField";
import { TimeRange } from "./TimeRange";

type G = {
  name?: string;
  location?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  weekday?: number | null;
  time?: string | null;
  maxPlayers?: number | null;
  teamsCount?: number;
  monthlyFeeCents?: number;
  singleFeeCents?: number;
  paymentDueDay?: number;
  durationMin?: number;
  format?: GameFormat;
  access?: MatchAccess;
  modality?: Modality;
  level?: Level;
};

export function GroupFields({ g = {}, withDueDay = false }: { g?: G; withDueDay?: boolean }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="name">Nome da pelada</label>
        <input className="input" id="name" name="name" placeholder="Pelada dos Amigos" defaultValue={g.name} required />
      </div>
      <PlaceField v={g} />
      <div>
        <label className="label" htmlFor="weekday">Dia</label>
        <select className="input" id="weekday" name="weekday" defaultValue={g.weekday ?? 3}>
          {WEEKDAYS.map((w, i) => (
            <option key={w} value={i}>{w}</option>
          ))}
        </select>
      </div>
      <TimeRange start={g.time ?? "20:00"} end={addToTime(g.time ?? "20:00", g.durationMin ?? 60)} />
      <Pills name="modality" legend="Modalidade" value={g.modality ?? "SOCIETY"} options={MODALITIES} />
      <Pills name="level" legend="Nível da turma" value={g.level ?? "INTERMEDIATE"} options={LEVELS} />
      <Choice name="format" legend="Formato da pelada" value={g.format ?? "TWO_TEAMS"} options={FORMATS} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="maxPlayers">Limite de jogadores</label>
          <input className="input" id="maxPlayers" name="maxPlayers" type="number" inputMode="numeric" min={2} placeholder="Sem limite" defaultValue={g.maxPlayers ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="teamsCount">Times</label>
          <select className="input" id="teamsCount" name="teamsCount" defaultValue={g.teamsCount ?? 2}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} times</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="monthlyFee">Mensalidade (R$)</label>
          <input className="input" id="monthlyFee" name="monthlyFee" inputMode="decimal" placeholder="100,00" defaultValue={centsToInput(g.monthlyFeeCents || null)} />
        </div>
        <div>
          <label className="label" htmlFor="singleFee">Avulso por jogo (R$)</label>
          <input className="input" id="singleFee" name="singleFee" inputMode="decimal" placeholder="15,00" defaultValue={centsToInput(g.singleFeeCents || null)} />
        </div>
      </div>
      <Choice name="access" legend="Acesso padrão das partidas" value={g.access ?? "RESTRICTED"} options={ACCESS} />
      {withDueDay && (
        <div>
          <label className="label" htmlFor="paymentDueDay">Vencimento da mensalidade (dia do mês)</label>
          <input className="input" id="paymentDueDay" name="paymentDueDay" type="number" min={1} max={28} defaultValue={g.paymentDueDay ?? 10} />
        </div>
      )}
    </>
  );
}
