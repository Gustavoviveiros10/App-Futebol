"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Lock, Play, Timer } from "lucide-react";

const EARLY_MS = 10 * 60_000;

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3.5">
      <Play size={18} /> {pending ? "Abrindo..." : label}
    </button>
  );
}

/**
 * "Iniciar partida": só libera 10 minutos antes do horário.
 * Depois de iniciada, vira um atalho para o controle da partida.
 */
export function StartMatchButton({ startsAt, unlockLabel, started, controlHref, action }: {
  startsAt: string;
  unlockLabel: string;
  started: boolean;
  controlHref: string;
  action: () => Promise<void>;
}) {
  const at = new Date(startsAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  if (started)
    return (
      <Link href={controlHref} className="btn-primary w-full py-3.5">
        <Timer size={18} /> Abrir controle da partida
      </Link>
    );
  const open = now != null && now >= at - EARLY_MS;
  if (!open)
    return (
      <button type="button" disabled aria-disabled="true" className="btn w-full cursor-not-allowed bg-fg/[0.06] py-3.5 text-fg/45">
        <Lock size={16} /> Iniciar partida · libera às {unlockLabel}
      </button>
    );
  return (
    <form action={action}>
      <Btn label="Iniciar partida" />
    </form>
  );
}
