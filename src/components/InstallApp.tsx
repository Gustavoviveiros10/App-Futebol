"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Download, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";

type Mode = "prompt" | "android" | "ios";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const KEY = "jc_install_dismissed";

/**
 * Cartão "Instale o Jogus no celular". Só aparece no celular e fora do app instalado.
 * Android com Chrome: botão que abre o pedido de instalação. iPhone: o passo a passo do Safari.
 * Com `dismissible`, some de vez quando a pessoa fecha.
 */
export function InstallApp({ dismissible = true, className = "" }: { dismissible?: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [steps, setSteps] = useState(false);
  const deferred = useRef<InstallEvent | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return;
    try {
      if (dismissible && localStorage.getItem(KEY)) return;
    } catch {}
    const ua = nav.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    if (ios) setMode("ios");
    else if (android) setMode("android");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as InstallEvent;
      if (!ios && android) setMode("prompt");
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [dismissible]);

  if (!mode) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setMode(null);
  };

  const install = async () => {
    const e = deferred.current;
    if (!e) return setSteps(true);
    await e.prompt();
    if ((await e.userChoice).outcome === "accepted") setMode(null);
    deferred.current = null;
  };

  return (
    <div className={`card relative p-4 ${className}`} data-testid="install-app">
      {dismissible && (
        <button type="button" onClick={dismiss} className="absolute right-2 top-2 rounded-full p-2 text-fg/40 hover:text-fg/70" aria-label="Agora não">
          <X size={16} />
        </button>
      )}
      <div className="flex items-center gap-3 pr-6">
        <img src="/icons/icon-192.png" width={44} height={44} alt="" className="shrink-0 rounded-xl ring-1 ring-fg/10" />
        <div>
          <p className="font-bold leading-tight">Tenha o Jogus na tela do celular</p>
          <p className="text-sm text-fg/55">Abre em um toque, como um aplicativo. Sem loja e sem ocupar espaço.</p>
        </div>
      </div>

      {mode === "prompt" && !steps ? (
        <button type="button" onClick={install} className="btn-primary mt-3 w-full">
          <Download size={18} /> Instalar o Jogus
        </button>
      ) : !steps ? (
        <button type="button" onClick={() => setSteps(true)} className="btn-ghost mt-3 w-full">
          Ver como instalar
        </button>
      ) : mode === "ios" ? (
        <ol className="mt-3 space-y-2 text-sm text-fg/75">
          <Step n={1}>
            Toque em <b>Compartilhar</b> <Share size={15} className="inline align-[-2px] text-accent" /> na barra do Safari.
          </Step>
          <Step n={2}>
            Role e toque em <b>Adicionar à Tela de Início</b> <SquarePlus size={15} className="inline align-[-2px] text-accent" />.
          </Step>
          <Step n={3}>
            Toque em <b>Adicionar</b>. Pronto, o Jogus aparece junto com seus apps.
          </Step>
          <li className="pt-1 text-xs text-fg/45">Abriu pelo WhatsApp? Abra o link no Safari primeiro.</li>
        </ol>
      ) : (
        <ol className="mt-3 space-y-2 text-sm text-fg/75">
          <Step n={1}>
            Toque no menu <EllipsisVertical size={15} className="inline align-[-2px] text-accent" /> no canto de cima do navegador.
          </Step>
          <Step n={2}>
            Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
          </Step>
          <Step n={3}>Confirme. Pronto, o Jogus aparece junto com seus apps.</Step>
          <li className="pt-1 text-xs text-fg/45">Abriu pelo WhatsApp? Toque nos três pontos e em &quot;Abrir no Chrome&quot; primeiro.</li>
        </ol>
      )}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-extrabold text-bg">{n}</span>
      <span>{children}</span>
    </li>
  );
}
