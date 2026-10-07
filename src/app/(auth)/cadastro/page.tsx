import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { signUp } from "../actions";
import { redirectIfLoggedIn } from "@/lib/auth";

export const metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  await redirectIfLoggedIn(next);
  const invited = next?.startsWith("/convite/");
  return (
    <div className="card p-6">
      <h1 className="text-4xl">Criar conta</h1>
      <p className="mb-5 mt-1 text-sm text-fg/55">
        {invited ? "Crie sua conta para entrar na pelada." : "Grátis. Leva menos de 1 minuto."}
      </p>
      <ActionForm action={signUp}>
        <input type="hidden" name="next" value={next ?? ""} />
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
        <SubmitButton pendingText="Criando...">Criar conta</SubmitButton>
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
