"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Em produção o Next esconde a mensagem de erros do servidor; mostramos uma genérica.
  const msg = error.message && !error.message.includes("Server Components render") ? error.message : "Algo deu errado. Tente de novo.";
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">🟨</p>
      <h1 className="mt-3 text-xl font-extrabold">Opa, falta!</h1>
      <p className="mt-1 text-black/60">{msg}</p>
      <div className="mt-6 flex gap-2">
        <button onClick={reset} className="btn-primary">Tentar de novo</button>
        <Link href="/app?todas=1" className="btn-ghost">Início</Link>
      </div>
    </div>
  );
}
