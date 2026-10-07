import Link from "next/link";
import { APP_NAME } from "@/lib/actions";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pitch-gradient px-6 pb-16 pt-10 text-white">
        <Link href="/" className="text-lg font-black tracking-tight">
          ⚽ {APP_NAME}
        </Link>
        <p className="mt-6 text-3xl font-extrabold leading-tight tracking-tight">
          Você organiza a pelada.
          <br />
          <span className="text-lime-accent">O app cuida do resto.</span>
        </p>
      </div>
      <main className="mx-auto -mt-10 w-full max-w-md flex-1 px-4 pb-10">{children}</main>
    </div>
  );
}
