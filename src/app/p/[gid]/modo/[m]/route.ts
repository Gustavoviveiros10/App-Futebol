import { NextResponse } from "next/server";

// links antigos da troca Organizador/Jogador: agora é uma tela só
export async function GET(req: Request, { params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params;
  return NextResponse.redirect(new URL(`/p/${gid}`, req.url));
}
