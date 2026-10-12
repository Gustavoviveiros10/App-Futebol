import { NextResponse } from "next/server";
import { sendTrialNotices } from "@/lib/trial-notices";

export const dynamic = "force-dynamic";

/** Cron diário da Vercel (vercel.json). A Vercel manda "Authorization: Bearer <CRON_SECRET>". */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await sendTrialNotices()) });
  } catch (e) {
    console.error("cron avisos-teste", e);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
