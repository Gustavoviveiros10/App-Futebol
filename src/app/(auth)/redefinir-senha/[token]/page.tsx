import { ActionForm, SubmitButton } from "@/components/forms";
import { resetPassword } from "../../actions";

export const metadata = { title: "Nova senha" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="card p-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Criar nova senha</h1>
      <ActionForm action={resetPassword}>
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="label" htmlFor="password">Nova senha</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Repita a senha</label>
          <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <SubmitButton pendingText="Salvando...">Salvar nova senha</SubmitButton>
      </ActionForm>
    </div>
  );
}
