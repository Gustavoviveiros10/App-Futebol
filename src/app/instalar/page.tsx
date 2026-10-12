import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformTabs } from "./PlatformTabs";

export const metadata = { title: "Coloque o Jogus na tela do celular", description: "Passo a passo para ter o Jogus na tela de início do iPhone ou do Android, como um aplicativo." };

export default function Instalar() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-16 pt-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-fg/60"><ArrowLeft size={16} /> Jogus</Link>
      <div>
        <h1 className="text-4xl">Coloque o Jogus na <span className="text-accent">tela do celular</span></h1>
        <p className="mt-2 text-sm text-fg/60">Ele abre em um toque, como um aplicativo. Não precisa baixar nada na loja e não ocupa espaço.</p>
      </div>
      <PlatformTabs />
      <p className="text-center text-xs text-fg/45">Abriu o link pelo WhatsApp ou Instagram? Abra primeiro no Safari (iPhone) ou no Chrome (Android).</p>
    </main>
  );
}
