import { WEEKDAYS, centsToInput } from "@/lib/format";

type G = {
  name?: string;
  location?: string | null;
  weekday?: number | null;
  time?: string | null;
  maxPlayers?: number | null;
  teamsCount?: number;
  monthlyFeeCents?: number;
  singleFeeCents?: number;
  paymentDueDay?: number;
};

export function GroupFields({ g = {}, withDueDay = false }: { g?: G; withDueDay?: boolean }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="name">Nome da pelada</label>
        <input className="input" id="name" name="name" placeholder="Pelada dos Amigos" defaultValue={g.name} required />
      </div>
      <div>
        <label className="label" htmlFor="location">Local</label>
        <input className="input" id="location" name="location" placeholder="Arena X" defaultValue={g.location ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="weekday">Dia</label>
          <select className="input" id="weekday" name="weekday" defaultValue={g.weekday ?? 3}>
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i}>{w}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="time">Horário</label>
          <input className="input" id="time" name="time" type="time" defaultValue={g.time ?? "20:00"} />
        </div>
      </div>
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
      {withDueDay && (
        <div>
          <label className="label" htmlFor="paymentDueDay">Vencimento da mensalidade (dia do mês)</label>
          <input className="input" id="paymentDueDay" name="paymentDueDay" type="number" min={1} max={28} defaultValue={g.paymentDueDay ?? 10} />
        </div>
      )}
    </>
  );
}
