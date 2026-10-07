import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/actions";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — o administrador da sua pelada`, template: `%s · ${APP_NAME}` },
  description: "Você organiza a pelada. O aplicativo cuida do resto: presença, times, financeiro e estatísticas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d7142",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
