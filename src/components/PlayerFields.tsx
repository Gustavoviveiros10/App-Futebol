import type { Player } from "@prisma/client";
import { POSITIONS, centsToInput, utcToZonedInput } from "@/lib/format";
import { PhotoInput } from "./PhotoInput";
import { StarInput } from "./StarInput";

export function PlayerFields({ p, defaultMonthly, canSetRole }: { p?: Player; defaultMonthly: number; canSetRole?: boolean }) {
  return (
    <>
      <PhotoInput name="photo" initial={p?.name ?? "?"} defaultValue={p?.photo} />
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input className="input" id="name" name="name" defaultValue={p?.name} required autoFocus={!p} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="nickname">Apelido</label>
          <input className="input" id="nickname" name="nickname" defaultValue={p?.nickname ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="phone">WhatsApp</label>
          <input className="input" id="phone" name="phone" type="tel" inputMode="tel" placeholder="(11) 99999-9999" defaultValue={p?.phone ?? ""} />
        </div>
      </div>

      <fieldset>
        <legend className="label">Posição preferida</legend>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(POSITIONS).map(([k, v]) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="position" value={k} defaultChecked={(p?.position ?? "MIDFIELDER") === k} className="peer sr-only" />
              <span className="flex flex-col items-center rounded-2xl bg-fg/[0.04] px-2 py-2.5 text-sm font-semibold text-fg/60 ring-accent/40 peer-checked:bg-accent/10 peer-checked:text-accent peer-checked:ring-2">
                <span className="font-display text-lg font-bold">{v.short}</span>
                {v.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Pagamento</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["MONTHLY", "Mensalista"],
            ["PER_MATCH", "Avulso"],
          ].map(([k, l]) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="billingType" value={k} defaultChecked={(p?.billingType ?? "MONTHLY") === k} className="peer sr-only" />
              <span className="block rounded-2xl bg-fg/[0.04] py-3 text-center font-semibold text-fg/60 ring-accent/40 peer-checked:bg-accent/10 peer-checked:text-accent peer-checked:ring-2">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="monthlyFee">Mensalidade (R$) — só para mensalistas</label>
        <input className="input" id="monthlyFee" name="monthlyFee" inputMode="decimal" placeholder={`Padrão da pelada: ${centsToInput(defaultMonthly) || "0,00"}`} defaultValue={centsToInput(p?.monthlyFeeCents)} />
      </div>

      <div>
        <StarInput name="skill" label="Nível para o sorteio" defaultValue={p ? Math.round(p.skill / 2) : 3} />
        <p className="mt-1 text-xs text-fg/45">Só você vê. Serve apenas como referência para equilibrar os times.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="joinedAt">Entrou na pelada em</label>
          <input className="input" id="joinedAt" name="joinedAt" type="date" defaultValue={utcToZonedInput(p?.joinedAt ?? new Date()).date} />
        </div>
        {canSetRole && (
          <div>
            <label className="label" htmlFor="role">Acesso</label>
            <select className="input" id="role" name="role" defaultValue={p?.role ?? "PLAYER"}>
              <option value="PLAYER">Jogador</option>
              <option value="ORGANIZER">Administrador</option>
            </select>
          </div>
        )}
      </div>
    </>
  );
}
