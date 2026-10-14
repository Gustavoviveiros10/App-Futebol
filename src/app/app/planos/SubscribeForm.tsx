"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import type { ActionState } from "@/lib/actions";

/**
 * Botão de assinar (ou de começar o teste). Na primeira vez pede o CPF/CNPJ (exigido pelo Asaas para cobrar).
 * No teste grátis (`needsAddress`) pede também CEP, número e celular, exigidos pelo Asaas para cadastrar o cartão.
 * `subtle` vira um link discreto, para a opção secundária.
 */
export function SubscribeForm({ action, label, submitLabel = "Ir para o pagamento", needsDoc, needsAddress = false, primary, subtle = false }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; label: string; submitLabel?: string; needsDoc: boolean; needsAddress?: boolean; primary: boolean; subtle?: boolean }) {
  const [open, setOpen] = useState(!needsDoc && !needsAddress);
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
      {needsAddress && (
        <>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <div>
              <label className="label" htmlFor="cep">CEP</label>
              <input className="input" id="cep" name="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" required autoFocus={!needsDoc} />
            </div>
            <div>
              <label className="label" htmlFor="numero">Número</label>
              <input className="input" id="numero" name="numero" autoComplete="address-line2" placeholder="123" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="celular">Celular com DDD</label>
            <input className="input" id="celular" name="celular" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(11) 98765-4321" required />
            <p className="mt-1 text-xs text-fg/45">O cadastro do cartão pede endereço e celular. A rua vem pelo CEP.</p>
          </div>
        </>
      )}
      <SubmitButton className={cls} pendingText="Abrindo pagamento...">{needsDoc || needsAddress ? submitLabel : label}</SubmitButton>
    </ActionForm>
  );
}
