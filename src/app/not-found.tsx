import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-7xl font-bold text-accent">404</p>
      <h1 className="mt-2 text-4xl">Bola fora</h1>
      <p className="mt-1 text-fg/60">Essa página não existe ou você não tem acesso a ela.</p>
      <Link href="/app?todas=1" className="btn-primary mt-6">Voltar ao início</Link>
    </div>
  );
}
