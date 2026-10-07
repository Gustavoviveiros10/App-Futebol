import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPage() {
  return (
    <div className="card p-6">
      <h1 className="text-4xl">Recuperar senha</h1>
      <p className="mb-5 mt-1 text-sm text-fg/55">Enviaremos um link para você criar uma nova senha.</p>
      <ActionForm action={requestPasswordReset}>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <SubmitButton pendingText="Enviando...">Enviar link</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="font-semibold text-accent">Voltar para o login</Link>
      </p>
    </div>
  );
}
