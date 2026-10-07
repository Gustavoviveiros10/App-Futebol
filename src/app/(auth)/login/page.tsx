import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { signIn } from "../actions";
import { redirectIfLoggedIn } from "@/lib/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  await redirectIfLoggedIn(next);
  return (
    <div className="card p-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Entrar</h1>
      <ActionForm action={signIn}>
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton pendingText="Entrando...">Entrar</SubmitButton>
      </ActionForm>
      <div className="mt-5 flex flex-col items-center gap-3 text-sm">
        <Link href="/recuperar-senha" className="text-black/55">Esqueci minha senha</Link>
        <p className="text-black/55">
          Não tem conta?{" "}
          <Link href={`/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-pitch-700">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
