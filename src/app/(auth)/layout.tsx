import Link from "next/link";
import { LogoFull } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pitch-gradient px-5 pb-20 pt-6">
        <div className="mx-auto max-w-md">
          <Link href="/" className="mx-auto block w-fit">
            <LogoFull width={190} />
          </Link>
          <p className="mt-6 text-center font-display text-3xl font-bold uppercase leading-[0.95]">
            Sua partida, organizada <span className="text-accent">de gol a gol.</span>
          </p>
        </div>
      </div>
      <main className="mx-auto -mt-12 w-full max-w-md flex-1 px-4 pb-10">{children}</main>
    </div>
  );
}
