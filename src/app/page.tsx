/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Check, MessageCircle, Shuffle, UserCheck, Wallet, Trophy, Search, Layers, BadgePercent, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { trialAvailable } from "@/lib/billing";
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

// Telas reais do app (pelada de demonstração), capturadas a 390 × 844 @2x
const STEPS = [
  { img: "convite", n: "1", title: "Crie a partida e mande o link", text: "Data, horário, local e valor. O Jogus gera um convite pronto para o grupo do WhatsApp." },
  { img: "presenca", n: "2", title: "A galera confirma em um toque", text: "Quem recebe o link toca em Vou ou Não vou, sem baixar nada e sem cadastro. Você vê na hora quem vai, quem falta responder e cobra com um botão." },
  { img: "times", n: "3", title: "Sorteie times equilibrados", text: "O sorteio usa nível, posição, goleiros e o histórico de cada um. Nada de time dos amigos contra o resto." },
  { img: "controle", n: "4", title: "Comande o jogo pelo celular", text: "Cronômetro com alerta no fim do tempo e placar ao vivo. No rodízio, a tabela de pontos se atualiza sozinha." },
  { img: "resultado", n: "5", title: "Resultado, craque e avaliações", text: "Gols, assistências e votação do craque. Depois, cada um avalia quem jogou com ele e tudo vai para o perfil." },
];

const GALLERY = [
  { img: "rankings", title: "Rankings da temporada", text: "Pontos, artilharia e assistências por semana, mês e temporada." },
  { img: "financeiro", title: "Financeiro da pelada", text: "Mensalistas, avulsos, despesas e quem está devendo." },
  { img: "jogar", title: "Quero jogar hoje", text: "Partidas com vaga perto de você, por dia, local e nível." },
];

/** Moldura de celular para as telas do app. */
function Phone({ img, alt, className = "", priority = false }: { img: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`rounded-[2.4rem] bg-[#1b1e24] p-2 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] ring-1 ring-fg/10 ${className}`}>
      <img
        src={`/telas/${img}.webp`}
        alt={alt}
        width={390}
        height={844}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="block h-auto w-full rounded-[1.9rem]"
      />
    </div>
  );
}

export default async function Home() {
  if (await getCurrentUser()) redirect("/app");
  const trial = trialAvailable();
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
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
          <div>
          <p className="mt-16 inline-flex items-center gap-2 rounded-full bg-fg/[0.06] px-3 py-1 text-xs font-semibold text-fg/70 ring-1 ring-fg/10">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Gestão de pelada semanal
          </p>
          <h1 className="mt-5 text-[3.4rem] leading-[0.92] sm:text-8xl">
            Sua partida,
            <br />
            organizada
            <br />
            <span className="text-accent">de gol a gol.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg/60">
            Presença, lista de espera, sorteio de times, financeiro e estatísticas da sua pelada. Tudo no celular, sem grupo bagunçado e sem planilha.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro?perfil=organizador" className="btn-primary px-6 py-4 text-base">
              Sou organizador <ArrowRight size={18} />
            </Link>
            <Link href="/cadastro" className="btn-ghost px-6 py-4 text-base">Sou jogador</Link>
          </div>
          <Link href="/jogar?dia=hoje" className="card mt-4 flex max-w-xl items-center gap-3 transition hover:ring-accent/40">
            <Search size={20} className="shrink-0 text-accent" />
            <span className="flex-1">
              <b className="block">Quero jogar hoje</b>
              <small className="text-fg/55">Partidas com vaga perto de você</small>
            </span>
            <span className="btn-primary btn-sm">Buscar</span>
          </Link>
          <p className="mt-4 text-sm text-fg/40">Jogador usa de graça. Organizador assina o Pro{trial ? `, com ${TRIAL_DAYS} dias grátis` : ""}. Já tem conta? <Link href="/login" className="font-semibold text-fg/70 underline-offset-4 hover:underline">Entrar</Link></p>
          </div>
          <div className="relative mx-auto w-[260px] sm:w-[290px] lg:mt-16">
            <div className="absolute -inset-10 rounded-full bg-accent/10 blur-3xl" aria-hidden />
            <Phone img="inicio" alt="Tela inicial do organizador no Jogus, com a próxima pelada e a lista de confirmados" className="relative rotate-[2deg]" priority />
          </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pt-16">
        <p className="section-title px-0">Como funciona</p>
        <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Do convite ao craque da partida.</h2>
        <p className="mt-4 max-w-2xl text-fg/55">Estas são telas reais do app. Veja o caminho de uma pelada no Jogus, do link no grupo até o ranking.</p>
        <ol className="mt-12 flex flex-col gap-16 sm:gap-20">
          {STEPS.map((s, i) => (
            <li key={s.img} className={`flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-14 ${i % 2 ? "sm:flex-row-reverse" : ""}`}>
              <Phone img={s.img} alt={s.title} className="w-[240px] shrink-0 sm:w-[270px]" />
              <div className="max-w-md">
                <span className="font-display text-6xl font-bold leading-none text-accent">{s.n}</span>
                <h3 className="mt-2 font-display text-3xl font-bold uppercase leading-none sm:text-4xl">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-fg/60">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="pt-20">
        <div className="mx-auto max-w-5xl px-5">
          <p className="section-title px-0">E tem mais</p>
          <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Tudo da pelada num app só.</h2>
        </div>
        <div className="mx-auto mt-8 flex max-w-5xl snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:justify-center lg:grid lg:grid-cols-3 lg:gap-10 lg:overflow-visible lg:px-16">
          {GALLERY.map((g) => (
            <figure key={g.img} className="w-[220px] shrink-0 snap-start lg:w-auto">
              <Phone img={g.img} alt={g.title} />
              <figcaption className="mt-4">
                <b className="block">{g.title}</b>
                <small className="text-sm text-fg/55">{g.text}</small>
              </figcaption>
            </figure>
          ))}
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

        <p className="section-title mt-20 px-0">Por que o Jogus</p>
        <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Mais completo. Preço justo. Rachado pela galera.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="card p-5">
            <Layers size={22} className="text-accent" />
            <p className="mt-4 font-bold">O app mais completo do segmento</p>
            <p className="mt-1 text-sm leading-relaxed text-fg/55">Presença, sorteio, cronômetro, placar, financeiro, rankings, avaliações e busca de partidas. Tudo o que a pelada precisa, sem juntar três apps e uma planilha.</p>
          </div>
          <div className="card p-5">
            <BadgePercent size={22} className="text-accent" />
            <p className="mt-4 font-bold">Preço justo</p>
            <p className="mt-1 text-sm leading-relaxed text-fg/55">O Pro custa {money(PLANS.PRO.priceCents)} por mês para organizar a pelada inteira, com jogadores ilimitados.{trial ? ` E você testa ${TRIAL_DAYS} dias grátis antes de decidir.` : ""}</p>
          </div>
          <div className="card p-5 ring-1 ring-accent/40">
            <Users size={22} className="text-accent" />
            <p className="mt-4 font-bold">Não sai do bolso do organizador</p>
            <p className="mt-1 text-sm leading-relaxed text-fg/55">A assinatura entra na mensalidade e é dividida por todo mundo. Numa pelada de 20, fica em torno de <b className="text-fg">{money(Math.ceil(PLANS.PRO.priceCents / 20))} por jogador no mês</b>.</p>
          </div>
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
              <Link href={k === "FREE" ? "/cadastro" : "/cadastro?perfil=organizador"} className={`${k === "PRO" ? "btn-primary" : "btn-ghost"} mt-6`}>
                {k === "FREE" ? "Criar conta de jogador" : trial ? `Testar ${TRIAL_DAYS} dias grátis` : `Assinar o ${PLANS[k].name}`}
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
