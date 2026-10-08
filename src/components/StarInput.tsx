"use client";

import { useState } from "react";
import { StarIcon } from "./Stars";

/** Escolha de 1 a 5 estrelas; envia o número no campo `name`. */
export function StarInput({ name, label, defaultValue, size = 28, required }: { name: string; label: string; defaultValue?: number | null; size?: number; required?: boolean }) {
  const [v, setV] = useState(defaultValue ?? 0);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-fg/70">{label}</span>
      <div className="flex text-gold" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={v === i}
            aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
            onClick={() => setV(v === i ? 0 : i)}
            className="p-0.5 transition active:scale-90"
          >
            <StarIcon size={size} fill={v >= i ? 1 : 0} />
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={v || ""} required={required} />
    </div>
  );
}
