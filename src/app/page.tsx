import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/actions";
import { PLANS } from "@/lib/plans";
import { money } from "@/lib/format";

const FEATURES = [
  { icon: "✅", title: "Quem vai?", text: "Confirmação de presença em um toque, com lista de espera automática." },
  { icon: "💰", title: "Quem está devendo?", text: "Mensalidades e avulsos sob controle, sem planilha." },
  { icon: "🎲", title: "Quem joga onde?", text: "Sorteio de times equilibrado por nível, posição e desempenho." },
  { icon: "⚽", title: "Quem fez gol?", text: "Resultado, artilharia, assistências e craque da partida." },
  { icon: "📊", title: "Quem está jogando melhor?", text: "Rankings por semana, mês e temporada." },
  { icon: "💬", title: "Tudo no WhatsApp", text: "Compartilhe convite, times, resultado e cobrança com um botão." },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/app");
  return (
    <div className="min-h-dvh">
      <section className="pitch-gradient px-6 pb-14 pt-8 text-white">
        <div className="mx-auto max-w-3xl">
          <nav className="flex items-center justify-between">
            <span className="text-lg font-black tracking-tight">⚽ {APP_NAME}</span>
            <Link href="/login" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              Entrar
            </Link>
          </nav>
          <h1 className="mt-14 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Você organiza a pelada.
            <br />
            <span className="text-lime-accent">O app cuida do resto.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">
            Presença, lista de espera, sorteio de times, financeiro e estatísticas da sua pelada semanal. Tudo no celular, sem grupo bagunçado e sem planilha.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className="btn-accent px-6 py-4 text-base">Criar minha pelada grátis</Link>
            <Link href="/login" className="btn bg-white/10 px-6 py-4 text-base text-white hover:bg-white/20">Já tenho conta</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex gap-4">
              <div className="text-3xl">{f.icon}</div>
              <div>
                <p className="font-bold">{f.title}</p>
                <p className="text-sm text-black/55">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-4 mt-14 text-2xl font-extrabold tracking-tight">Planos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["FREE", "PRO", "PREMIUM"] as const).map((k) => (
            <div key={k} className={`card ${k === "PRO" ? "ring-2 ring-pitch-500" : ""}`}>
              <p className="font-bold">{PLANS[k].name}</p>
              <p className="mt-1 text-2xl font-black">
                {PLANS[k].priceCents ? money(PLANS[k].priceCents) : "R$ 0"}
                <span className="text-sm font-medium text-black/45">/mês</span>
              </p>
              <ul className="mt-3 space-y-1 text-sm text-black/65">
                {PLANS[k].features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-black/50">Toda pelada nova ganha 30 dias de Pro.</p>
      </section>
    </div>
  );
}
