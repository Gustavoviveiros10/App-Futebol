/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, Copy, EllipsisVertical, Lock, RotateCw, Share, SquarePlus, Star, Download, Bookmark } from "lucide-react";

export type Platform = "ios" | "android";

/** Passo a passo curto, em texto (usado no cartão de instalar). */
export function StepsText({ platform }: { platform: Platform }) {
  return platform === "ios" ? (
    <ol className="space-y-2 text-sm text-fg/75">
      <Step n={1}>Toque em <b>Compartilhar</b> <Share size={15} className="inline align-[-2px] text-accent" /> na barra do Safari.</Step>
      <Step n={2}>Role e toque em <b>Adicionar à Tela de Início</b> <SquarePlus size={15} className="inline align-[-2px] text-accent" />.</Step>
      <Step n={3}>Toque em <b>Adicionar</b>. Pronto, o Jogus aparece junto com seus apps.</Step>
      <li className="pt-1 text-xs text-fg/45">Abriu pelo WhatsApp? Abra o link no Safari primeiro.</li>
    </ol>
  ) : (
    <ol className="space-y-2 text-sm text-fg/75">
      <Step n={1}>Toque no menu <EllipsisVertical size={15} className="inline align-[-2px] text-accent" /> no canto de cima do Chrome.</Step>
      <Step n={2}>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</Step>
      <Step n={3}>Confirme. Pronto, o Jogus aparece junto com seus apps.</Step>
      <li className="pt-1 text-xs text-fg/45">Abriu pelo WhatsApp? Toque nos três pontos e em &quot;Abrir no Chrome&quot; primeiro.</li>
    </ol>
  );
}

export function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-extrabold text-bg">{n}</span>
      <span>{children}</span>
    </li>
  );
}

/** Passo a passo com desenhos da tela do celular (página /instalar). */
export function StepsIllustrated({ platform }: { platform: Platform }) {
  const steps = platform === "ios" ? IOS : ANDROID;
  return (
    <ol className="flex flex-col gap-4" data-testid={`steps-${platform}`}>
      {steps.map((s, i) => (
        <li key={i} className="card flex flex-col gap-3 p-4">
          <p className="flex items-start gap-2.5 text-[15px]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-bg">{i + 1}</span>
            <span>{s.text}</span>
          </p>
          <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[22px] bg-[#0b0d11] ring-4 ring-fg/10" aria-hidden>{s.art}</div>
        </li>
      ))}
    </ol>
  );
}

/** Destaque pulsando em volta do botão que a pessoa deve tocar. */
function Tap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative inline-flex items-center rounded-lg text-accent ${className}`}>
      <span className="absolute -inset-1.5 animate-ping rounded-xl ring-2 ring-accent/60" />
      <span className="absolute -inset-1.5 rounded-xl ring-2 ring-accent" />
      {children}
    </span>
  );
}

function PageBody() {
  return (
    <div className="flex h-32 flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2"><img src="/icons/icon-192.png" alt="" className="h-6 w-6 rounded-md" /><span className="h-2.5 w-20 rounded bg-fg/20" /></div>
      <span className="h-2 w-full rounded bg-fg/10" />
      <span className="h-2 w-4/5 rounded bg-fg/10" />
      <span className="mt-auto h-7 w-full rounded-lg bg-accent/70" />
    </div>
  );
}

function HomeScreen() {
  const apps = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#eab308", "#06b6d4"];
  return (
    <div className="grid grid-cols-4 gap-3 bg-gradient-to-b from-[#1b2333] to-[#0b0d11] px-4 py-5">
      {apps.map((c) => <span key={c} className="aspect-square rounded-[10px]" style={{ background: c, opacity: 0.55 }} />)}
      <span className="flex flex-col items-center gap-1">
        <Tap className="rounded-[10px]"><img src="/icons/icon-192.png" alt="" className="aspect-square w-full rounded-[10px]" /></Tap>
        <span className="text-[9px] font-semibold text-fg/80">Jogus</span>
      </span>
    </div>
  );
}

const IOS = [
  {
    text: <>Abra o <b>jogusconnect.com.br</b> no <b>Safari</b> e toque em <b>Compartilhar</b> <Share size={15} className="inline align-[-2px] text-accent" />, o quadrado com a setinha na barra de baixo.</>,
    art: (
      <>
        <PageBody />
        <div className="flex items-center justify-between border-t border-fg/10 bg-[#16191f] px-5 py-3 text-fg/50">
          <ChevronLeft size={18} /><ChevronRight size={18} /><Tap className="p-0.5"><Share size={18} /></Tap><Bookmark size={18} /><Copy size={18} />
        </div>
      </>
    ),
  },
  {
    text: <>Role a lista para baixo e toque em <b>Adicionar à Tela de Início</b> <SquarePlus size={15} className="inline align-[-2px] text-accent" />.</>,
    art: (
      <div className="flex flex-col gap-1.5 bg-[#16191f] p-3 text-[12px] text-fg/70">
        <span className="rounded-lg bg-fg/[0.06] px-3 py-2">Copiar</span>
        <span className="rounded-lg bg-fg/[0.06] px-3 py-2">Adicionar aos Favoritos</span>
        <Tap className="w-full justify-between rounded-lg bg-fg/[0.06] px-3 py-2 text-fg"><span>Adicionar à Tela de Início</span><SquarePlus size={15} className="text-accent" /></Tap>
        <span className="rounded-lg bg-fg/[0.06] px-3 py-2">Imprimir</span>
      </div>
    ),
  },
  {
    text: <>Toque em <b>Adicionar</b>, no canto de cima.</>,
    art: (
      <div className="bg-[#16191f] p-3 text-[12px]">
        <div className="flex items-center justify-between text-fg/60"><span>Cancelar</span><span className="font-semibold text-fg">Adicionar à Tela</span><Tap className="px-1 font-bold text-accent">Adicionar</Tap></div>
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-fg/[0.06] p-2.5"><img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-[10px]" /><span className="font-semibold text-fg">Jogus</span></div>
      </div>
    ),
  },
  { text: <>Pronto! O Jogus aparece na tela de início, junto com seus apps. É só tocar para abrir.</>, art: <HomeScreen /> },
];

const ANDROID = [
  {
    text: <>Abra o <b>jogusconnect.com.br</b> no <b>Chrome</b> e toque nos <b>três pontinhos</b> <EllipsisVertical size={15} className="inline align-[-2px] text-accent" /> no canto de cima.</>,
    art: (
      <>
        <div className="flex items-center gap-2 border-b border-fg/10 bg-[#16191f] px-3 py-2.5 text-fg/50">
          <span className="flex flex-1 items-center gap-1.5 rounded-full bg-fg/[0.08] px-3 py-1.5 text-[11px] text-fg/70"><Lock size={11} /> jogusconnect.com.br</span>
          <RotateCw size={15} />
          <Tap className="p-0.5"><EllipsisVertical size={18} /></Tap>
        </div>
        <PageBody />
      </>
    ),
  },
  {
    text: <>No menu, toque em <b>Instalar app</b>. Em alguns celulares aparece <b>Adicionar à tela inicial</b>.</>,
    art: (
      <div className="flex flex-col bg-[#16191f] py-1.5 text-[12px] text-fg/70">
        <span className="flex items-center gap-3 px-4 py-2"><Star size={14} /> Favoritos</span>
        <span className="flex items-center gap-3 px-4 py-2"><Download size={14} /> Downloads</span>
        <Tap className="mx-2 justify-start gap-3 rounded-lg bg-fg/[0.06] px-2 py-2 text-fg"><SquarePlus size={14} className="text-accent" /> Instalar app</Tap>
        <span className="flex items-center gap-3 px-4 py-2"><Share size={14} /> Compartilhar</span>
      </div>
    ),
  },
  {
    text: <>Confirme tocando em <b>Instalar</b>.</>,
    art: (
      <div className="bg-[#16191f] p-4 text-[12px]">
        <p className="font-semibold text-fg">Instalar app?</p>
        <div className="mt-3 flex items-center gap-3"><img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-full" /><span className="text-fg">Jogus<br /><span className="text-fg/50">jogusconnect.com.br</span></span></div>
        <div className="mt-4 flex justify-end gap-4"><span className="text-fg/60">Cancelar</span><Tap className="px-1 font-bold text-accent">Instalar</Tap></div>
      </div>
    ),
  },
  { text: <>Pronto! O Jogus aparece na tela inicial, junto com seus apps. É só tocar para abrir.</>, art: <HomeScreen /> },
];
