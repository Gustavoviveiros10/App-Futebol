"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import type { ActionState } from "@/lib/actions";

/**
 * Botão de assinar (ou de começar o teste). Na primeira vez pede o CPF/CNPJ (exigido pelo Asaas para cobrar).
 * `subtle` vira um link discreto, para a opção secundária.
 */
export function SubscribeForm({ action, label, submitLabel = "Ir para o pagamento", needsDoc, primary, subtle = false }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; label: string; submitLabel?: string; needsDoc: boolean; primary: boolean; subtle?: boolean }) {
  const [open, setOpen] = useState(!needsDoc);
  const cls = subtle ? "w-full py-2 text-sm font-semibold text-fg/55 underline underline-offset-4" : `${primary ? "btn-primary" : "btn-ghost"} w-full`;
  if (!open)
    return (
      <button type="button" className={`${cls} ${subtle ? "mt-1" : "mt-3"}`} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <ActionForm action={action} className="mt-3 flex flex-col gap-2">
      {needsDoc && (
        <div>
          <label className="label" htmlFor="cpfCnpj">CPF ou CNPJ de quem paga</label>
          <input className="input" id="cpfCnpj" name="cpfCnpj" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" required autoFocus />
          <p className="mt-1 text-xs text-fg/45">Exigido para emitir a cobrança. Pedimos só uma vez.</p>
        </div>
      )}
      <SubmitButton className={cls} pendingText="Abrindo pagamento...">{needsDoc ? submitLabel : label}</SubmitButton>
    </ActionForm>
  );
}
