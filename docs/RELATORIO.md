# Relatório final — MVP

## Arquitetura
Monólito Next.js 16 (App Router): as telas são Server Components que leem o banco direto, e todas as alterações são Server Actions validadas com Zod. Não há API REST separada para manter. Cada pelada é um tenant (`/p/[gid]`), protegida por `getMembership`/`requireOrganizer` e por filtros `groupId` em todas as consultas. Detalhes em [PLANEJAMENTO.md](PLANEJAMENTO.md) e no [README](../README.md).

## Tecnologias
Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 6 · Zod · bcrypt · lucide-react. Deploy pensado para Vercel + Postgres gerenciado.

## Estrutura do banco (prisma/schema.prisma)
User, Session, PasswordResetToken · Group (a pelada) · Subscription (plano) · Player (vínculo usuário↔pelada, papel, tipo de pagamento, posição, nível) · Season · Match · Team · MatchPlayer (presença, lista de espera, time, gols, assistências, cartões, defesas, nota) · Vote (craque) · Payment (mensalidade/avulso/outros, pronto para PIX/gateway) · Notification.

## Funcionalidades implementadas (testadas ponta a ponta no navegador)
1. Cadastro, login, logout e recuperação de senha por link de uso único
2. Criar pelada (com 30 dias de Pro grátis) e editar dados, vencimento, limite e valores
3. Jogadores: cadastro com foto, apelido, WhatsApp, posição, nível 1–10, mensalista/avulso, data de entrada; edição, remoção (mantém histórico), reativação
4. Convite por link: o jogador cria conta e escolhe "quem é você" na lista (mantém histórico) ou entra como novo
5. Partidas com data, horário, local, duração, valor avulso, nº de jogadores e de times (pré-preenchidas com o padrão da pelada); edição e cancelamento
6. Presença: Vou / Não vou / Não sei; organizador altera o status de qualquer um; fechar/reabrir lista; lembrete no app para pendentes
7. Lista de espera com limite e promoção automática (com notificação) quando alguém sai
8. Sorteio equilibrado (nível, posição, goleiros, notas e aproveitamento) ou aleatório, troca manual de time, força de cada time visível ao organizador
9. Resultado: placar, quem jogou, gols, assistências, cartões, defesas e nota 1–10
10. Craque da partida: votação pelos jogadores, apuração pelo organizador
11. Estatísticas no perfil do jogador (todos os tempos e temporada, últimas partidas)
12. Rankings: geral, artilharia, assistências, média, vitórias, goleiros, partidas, craques; filtros semana/mês/temporada/sempre
13. Histórico de partidas com placar e craque
14. Temporadas: iniciar nova zera o ranking da temporada sem perder histórico
15. Financeiro: previsto/recebido/pendente/atrasado, receita dos últimos 6 meses, mensalistas em dia/atrasados, gerar mensalidades do mês, cobrança automática de avulsos ao encerrar partida, marcar pago (PIX, dinheiro...), desfazer, cancelar, cobrança avulsa, filtros (todos, pagos, pendentes, atrasados, mensalistas, avulsos)
16. Jogador vê só o próprio financeiro; telas administrativas escondidas
17. Dashboard do organizador e do jogador, com passo a passo inicial
18. Notificações no app (partida marcada, lembrete, vaga liberada, times sorteados, resultado, craque, cobrança)
19. WhatsApp com mensagem pronta: convite da pelada, link de confirmação, lista, cobrança de resposta, times, resultado, cobrança de pagamento
20. Estrutura de planos (Gratuito até 10 jogadores, Pro, Premium) com limite aplicado

## Ficou para a próxima versão
Cobrança real da assinatura e PIX automático · WhatsApp via API e lembretes agendados · notas dadas pelos jogadores · upload de foto em storage · PWA/push · personalização (Premium) · rate limiting no login · confirmação sem senha (link mágico).

## Como executar e fazer deploy
Ver [README](../README.md#rodar-localmente).
