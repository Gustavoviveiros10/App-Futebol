import type { GameFormat, Level, MatchAccess, Modality } from "@prisma/client";

export const FORMATS: Record<GameFormat, { label: string; text: string }> = {
  TWO_TEAMS: { label: "2 times", text: "Um jogo por partida e um vencedor no placar final." },
  ROTATION: { label: "Vários times (rodízio)", text: "Vários jogos na mesma noite. Vence quem somar mais pontos: vitória 3, empate 1, derrota 0." },
};

export const ACCESS: Record<MatchAccess, { label: string; text: string }> = {
  RESTRICTED: { label: "Restrita", text: "Só os jogadores da pelada e quem recebe o link. Ninguém de fora encontra na busca." },
  APPROVAL: { label: "Com aprovação", text: "Aparece em \"Quero jogar\". O jogador pede vaga e você aprova." },
  OPEN: { label: "Aberta", text: "Aparece em \"Quero jogar\" e qualquer um entra direto enquanto houver vaga." },
};

export const MODALITIES: Record<Modality, string> = { SOCIETY: "Society", FUTSAL: "Futsal", FIELD: "Campo" };
export const LEVELS: Record<Level, string> = { BEGINNER: "Iniciante", INTERMEDIATE: "Intermediário", ADVANCED: "Avançado" };
