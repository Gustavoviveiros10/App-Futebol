"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";
import { StepsText } from "./InstallSteps";

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
      ) : (
        <div className="mt-3">
          <StepsText platform={mode === "ios" ? "ios" : "android"} />
          <Link href="/instalar" className="mt-3 block text-center text-sm font-semibold text-accent">Ver o passo a passo com imagens</Link>
        </div>
      )}
    </div>
  );
}
