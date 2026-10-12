import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { signUp } from "../actions";
import { redirectIfLoggedIn } from "@/lib/auth";

export const metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; perfil?: string }> }) {
  const { next, perfil } = await searchParams;
  await redirectIfLoggedIn(next);
  const invited = next?.startsWith("/convite/");
  const org = !invited && perfil === "organizador";
  const tab = (on: boolean) => `rounded-lg py-2 text-center ${on ? "bg-fg/10 text-fg" : "text-fg/50"}`;
  return (
    <div className="card p-6">
      {!invited && (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-fg/[0.05] p-1 text-sm font-semibold ring-1 ring-fg/[0.07]">
          <Link href="/cadastro" replace className={tab(!org)}>Sou jogador</Link>
          <Link href="/cadastro?perfil=organizador" replace className={tab(org)}>Sou organizador</Link>
        </div>
      )}
      <h1 className="text-4xl">{org ? "Conta de organizador" : "Criar conta"}</h1>
      <p className="mb-5 mt-1 text-sm text-fg/55">
        {invited
          ? "Crie sua conta para entrar na pelada."
          : org
            ? "Depois do cadastro você assina o plano Pro e monta sua pelada."
            : "Grátis para jogar. Você entra na pelada pelo link de convite do organizador."}
      </p>
      <ActionForm action={signUp}>
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="perfil" value={org ? "organizador" : "jogador"} />
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <input className="input" id="name" name="name" autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <p className="mt-1 text-xs text-fg/45">Mínimo de 8 caracteres.</p>
        </div>
        <SubmitButton pendingText="Criando...">{org ? "Continuar para o plano Pro" : "Criar conta"}</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-sm text-fg/55">
        Já tem conta?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent">
          Entrar
        </Link>
      </p>
    </div>
  );
}
