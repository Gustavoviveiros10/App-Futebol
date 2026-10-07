import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pitch-gradient px-5 pb-20 pt-6">
        <div className="mx-auto max-w-md">
          <Link href="/">
            <Logo />
          </Link>
          <p className="mt-10 font-display text-4xl font-bold uppercase leading-[0.95]">
            Você organiza.
            <br />
            <span className="text-accent">O app cuida do resto.</span>
          </p>
        </div>
      </div>
      <main className="mx-auto -mt-12 w-full max-w-md flex-1 px-4 pb-10">{children}</main>
    </div>
  );
}
