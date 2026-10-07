import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">🥅</p>
      <h1 className="mt-3 text-xl font-extrabold">Bola fora</h1>
      <p className="mt-1 text-black/60">Essa página não existe ou você não tem acesso a ela.</p>
      <Link href="/app?todas=1" className="btn-primary mt-6">Voltar ao início</Link>
    </div>
  );
}
