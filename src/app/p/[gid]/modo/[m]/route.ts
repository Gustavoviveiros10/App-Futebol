import { NextResponse, type NextRequest } from "next/server";
import { VIEW_COOKIE } from "@/lib/tenancy";

/** Entra na pelada já no modo escolhido (usado pela lista "Peladas que organizo"). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ gid: string; m: string }> }) {
  const { gid, m } = await params;
  const res = NextResponse.redirect(new URL(`/p/${encodeURIComponent(gid)}`, req.url));
  res.cookies.set(VIEW_COOKIE, m === "jogador" ? "jogador" : "organizador", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  return res;
}
