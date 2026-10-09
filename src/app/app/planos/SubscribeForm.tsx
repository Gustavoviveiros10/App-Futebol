"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import type { ActionState } from "@/lib/actions";

/** Botão de assinar. Na primeira assinatura pede o CPF/CNPJ (exigido pelo Asaas para cobrar). */
export function SubscribeForm({ action, label, needsDoc, primary }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; label: string; needsDoc: boolean; primary: boolean }) {
  const [open, setOpen] = useState(!needsDoc);
  const cls = `${primary ? "btn-primary" : "btn-ghost"} w-full`;
  if (!open)
    return (
      <button type="button" className={`${cls} mt-3`} onClick={() => setOpen(true)}>
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
      <SubmitButton className={cls} pendingText="Abrindo pagamento...">{needsDoc ? "Ir para o pagamento" : label}</SubmitButton>
    </ActionForm>
  );
}
