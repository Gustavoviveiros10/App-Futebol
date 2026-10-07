import type { Player } from "@prisma/client";
import { POSITIONS, centsToInput, utcToZonedInput } from "@/lib/format";
import { PhotoInput } from "./PhotoInput";

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
              <span className="flex flex-col items-center rounded-2xl bg-black/[0.04] px-2 py-2.5 text-sm font-semibold text-black/60 ring-pitch-500 peer-checked:bg-pitch-50 peer-checked:text-pitch-800 peer-checked:ring-2">
                <span className="text-lg">{v.emoji}</span>
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
              <span className="block rounded-2xl bg-black/[0.04] py-3 text-center font-semibold text-black/60 ring-pitch-500 peer-checked:bg-pitch-50 peer-checked:text-pitch-800 peer-checked:ring-2">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="monthlyFee">Mensalidade (R$) — só para mensalistas</label>
        <input className="input" id="monthlyFee" name="monthlyFee" inputMode="decimal" placeholder={`Padrão da pelada: ${centsToInput(defaultMonthly) || "0,00"}`} defaultValue={centsToInput(p?.monthlyFeeCents)} />
      </div>

      <div>
        <label className="label" htmlFor="skill">Nível (1 a 10)</label>
        <input className="w-full accent-pitch-600" id="skill" name="skill" type="range" min={1} max={10} defaultValue={p?.skill ?? 5} />
        <div className="flex justify-between px-0.5 text-xs text-black/40">
          {Array.from({ length: 10 }, (_, i) => <span key={i}>{i + 1}</span>)}
        </div>
        <p className="mt-1 text-xs text-black/45">Só você vê. Serve apenas como referência para equilibrar os times.</p>
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
              <option value="ORGANIZER">Organizador</option>
            </select>
          </div>
        )}
      </div>
    </>
  );
}
