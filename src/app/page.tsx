import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Check, MessageCircle, Shuffle, UserCheck, Wallet, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { money } from "@/lib/format";
import { Logo } from "@/components/Logo";

const FEATURES = [
  { icon: UserCheck, title: "Presença em um toque", text: "Vou, não vou ou talvez. Lotou? Lista de espera automática, e quem desiste libera a vaga sozinho." },
  { icon: Shuffle, title: "Times equilibrados", text: "Sorteio por nível, posição e desempenho. Dá para ajustar na mão depois." },
  { icon: Wallet, title: "Financeiro sem planilha", text: "Mensalistas e avulsos, quem pagou, quem está devendo e cobrança pronta." },
  { icon: Trophy, title: "Resultado e craque", text: "Placar, gols, assistências e votação do craque da partida." },
  { icon: BarChart3, title: "Rankings da temporada", text: "Artilharia, assistências, vitórias e média por semana, mês e temporada." },
  { icon: MessageCircle, title: "Feito para o WhatsApp", text: "Convite, times, resultado e cobrança com um botão, direto no grupo." },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/app");
  return (
    <div className="min-h-dvh">
      <section className="pitch-gradient relative overflow-hidden px-5 pb-16 pt-6">
        <div className="mx-auto max-w-5xl">
          <nav className="flex items-center justify-between">
            <Logo />
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-fg/70 hover:text-fg">
              Entrar
            </Link>
          </nav>
          <p className="mt-16 inline-flex items-center gap-2 rounded-full bg-fg/[0.06] px-3 py-1 text-xs font-semibold text-fg/70 ring-1 ring-fg/10">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Gestão de pelada semanal
          </p>
          <h1 className="mt-5 text-[3.4rem] leading-[0.92] sm:text-8xl">
            Você organiza.
            <br />
            <span className="text-accent">O app cuida do resto.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg/60">
            Presença, lista de espera, sorteio de times, financeiro e estatísticas da sua pelada. Tudo no celular, sem grupo bagunçado e sem planilha.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className="btn-primary px-6 py-4 text-base">
              Criar conta grátis <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-4 text-base">Já tenho conta</Link>
          </div>
          <p className="mt-4 text-sm text-fg/40">Jogador usa de graça. Organizador tem {TRIAL_DAYS} dias de Pro grátis, sem cartão.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="section-title px-0">O que resolve</p>
        <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Quem vai, quem paga, quem joga onde.</h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl bg-fg/[0.07] ring-1 ring-fg/[0.07] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface p-5">
              <f.icon size={22} className="text-accent" strokeWidth={2} />
              <p className="mt-4 font-bold">{f.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg/55">{f.text}</p>
            </div>
          ))}
        </div>

        <p className="section-title mt-20 px-0">Planos</p>
        <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Entre de graça. Organize no Pro.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {(["FREE", "PRO", "PREMIUM"] as const).map((k) => (
            <div key={k} className={`card flex flex-col p-5 ${k === "PRO" ? "ring-2 ring-accent/80" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-bold">{PLANS[k].name}</p>
                {k === "PRO" && <span className="chip bg-accent text-bg">Mais escolhido</span>}
              </div>
              <p className="text-sm text-fg/45">{PLANS[k].tagline}</p>
              <p className="mt-4 font-display text-5xl font-bold">
                {PLANS[k].priceCents ? money(PLANS[k].priceCents) : "Grátis"}
                {PLANS[k].priceCents > 0 && <span className="ml-1 font-sans text-sm font-medium text-fg/40">/mês</span>}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-fg/70">
                {PLANS[k].features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-accent" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/cadastro" className={`${k === "PRO" ? "btn-primary" : "btn-ghost"} mt-6`}>
                {k === "FREE" ? "Criar conta" : `Testar ${TRIAL_DAYS} dias grátis`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-fg/[0.07] px-5 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm text-fg/40">
          <Logo className="opacity-70" />
          <span>Feito para quem joga toda semana.</span>
        </div>
      </footer>
    </div>
  );
}
