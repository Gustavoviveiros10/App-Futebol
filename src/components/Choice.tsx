/** Grupo de opções em cartões (rádio), sem JavaScript. */
export function Choice({ name, legend, value, options }: { name: string; legend: string; value: string; options: Record<string, { label: string; text?: string } | string> }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-col gap-2">
        {Object.entries(options).map(([k, o]) => {
          const { label, text } = typeof o === "string" ? { label: o, text: undefined } : o;
          return (
            <label key={k} className="flex cursor-pointer items-start gap-3 rounded-xl bg-fg/[0.04] p-3 ring-1 ring-fg/[0.07] has-[:checked]:bg-accent/[0.07] has-[:checked]:ring-accent/60">
              <input type="radio" name={name} value={k} defaultChecked={k === value} className="mt-1 accent-[var(--color-accent)]" />
              <span>
                <b className="block text-sm">{label}</b>
                {text && <small className="block text-xs text-fg/55">{text}</small>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Versão compacta: pílulas lado a lado. */
export function Pills({ name, legend, value, options }: { name: string; legend: string; value: string; options: Record<string, string> }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([k, label]) => (
          <label key={k} className="cursor-pointer rounded-full bg-fg/[0.05] px-3 py-1.5 text-sm font-semibold ring-1 ring-fg/[0.08] has-[:checked]:bg-accent has-[:checked]:text-bg">
            <input type="radio" name={name} value={k} defaultChecked={k === value} className="sr-only" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
