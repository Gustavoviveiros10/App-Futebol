# Planejamento — App de Peladas (SaaS)

> "Você organiza a pelada. O aplicativo cuida do resto."

Este documento é a etapa 27 da especificação: análise, arquitetura, banco, telas, fluxos, riscos de UX e prioridade do MVP. Ele foi escrito antes do código e guia a primeira versão.

---

## 1. Análise da especificação

O produto resolve 10 perguntas do organizador (quem vai, quem deve, quem joga onde, quem fez gol, quem foi o craque...). Tudo gira em torno de um ciclo semanal:

```
criar pelada → cadastrar jogadores → criar partida → enviar convite → confirmações
→ fechar lista → sortear times → jogar → registrar resultado → estatísticas → ranking
```

Decisões que saem dessa leitura:

- **O "tenant" é a pelada**, não o organizador. Um usuário pode organizar uma pelada e jogar em outra, então o papel (organizador/jogador) mora na relação usuário↔pelada, não no usuário.
- **Jogador existe antes de ter conta.** O organizador cadastra "João" hoje; o João cria a conta depois pelo link de convite e diz "sou eu". Por isso `Player` tem `userId` opcional.
- **WhatsApp é o canal principal.** Toda tela importante tem um botão "Enviar no WhatsApp" com texto pronto (link `wa.me`), sem depender de API oficial.
- **Dinheiro é a dor nº 1.** Valores guardados em centavos (inteiro), cobranças como registros (`Payment`) com status, prontos para receber um `provider`/`externalId` de PIX/gateway no futuro.

## 2. Arquitetura técnica

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript** | Front e back no mesmo projeto, Server Components e Server Actions (sem API REST para manter), deploy trivial na Vercel |
| Estilo | **Tailwind CSS 4** | Mobile-first rápido, visual consistente |
| Banco | **PostgreSQL + Prisma 6** | Relacional (o domínio é muito relacional), migrations versionadas, tipos gerados |
| Autenticação | **Sessão própria em banco** (cookie httpOnly + token com hash SHA-256, senha com bcrypt) | Simples, auditável, sem dependência beta; sessões revogáveis; recuperação de senha por token de uso único |
| Validação | **Zod** | Toda entrada de formulário validada no servidor |
| E-mail | Driver plugável (`lib/mail.ts`): console em dev, **Resend** se `RESEND_API_KEY` existir | Recuperação de senha funciona em produção sem acoplar a um fornecedor |
| Hospedagem | **Vercel** + Postgres gerenciado (Neon, Supabase, Railway...) | Custo baixo para começar |

**Multi-tenant e permissões.** Todas as rotas da pelada ficam em `/p/[groupId]/...`. O layout carrega o vínculo do usuário com aquela pelada (`getMembership`) e devolve 404 se não existir. Toda Server Action recebe o `groupId`, chama `requireMember` ou `requireOrganizer`, e toda consulta/alteração filtra por `groupId` (ex.: `update where { id, groupId }`), então um id de outra pelada nunca é aceito, mesmo forjado.

**Pronto para o futuro.**
- *Planos*: `Subscription` por usuário (quem paga é o organizador) + `lib/plans.ts`. Jogador (grátis) entra em peladas por convite; Pro (1 pelada) e Premium (até 3) permitem criar a própria pelada, com 30 dias de teste. Cobrança real entra trocando a ativação de teste por checkout.
- *Pagamentos*: `Payment.method/provider/externalId` para PIX e gateways (webhook só precisa marcar `PAID`).
- *Notificações*: tabela `Notification` + `lib/notify.ts`. Hoje grava no app; amanhã o mesmo ponto envia WhatsApp/push.

## 3. Banco de dados

```
User ─┬─< Session
      ├─< PasswordResetToken
      ├─< Player (um por pelada em que participa) >── Group (a pelada / tenant)
      └─< Notification                                 │
                                                       ├── Subscription (plano)
Group ─┬─< Season                                      │
       ├─< Player ─┬─< MatchPlayer >─ Match            │
       │           ├─< Payment                          │
       │           └─< Vote (eleitor e votado)          │
       ├─< Match ─┬─< Team ─< MatchPlayer               │
       │          ├─< MatchPlayer (presença + estatística da partida)
       │          └─< Vote (craque)
       └─< Payment
```

Mapeamento para as entidades pedidas na seção 22:

| Pedido | Implementação |
|---|---|
| Users | `User` (+ `Session`, `PasswordResetToken`) |
| Players | `Player` (cadastro na pelada, papel ORGANIZER/PLAYER, tipo de pagamento, posição, nível) |
| Teams | `Team` (por partida, com placar) |
| Matches | `Match` |
| MatchPlayers | `MatchPlayer` (presença, lista de espera, time, e estatísticas daquela partida) |
| Payments | `Payment` (mensalidade ou avulso, status, vencimento, forma) |
| Ratings | `MatchPlayer.rating` (nota 1–10 por partida) |
| Goals / Assists | `MatchPlayer.goals` / `MatchPlayer.assists` (+ cartões, defesas) |
| Votes | `Vote` (craque da partida, 1 voto por jogador por partida) |
| Seasons | `Season` |
| Subscriptions | `Subscription` |
| Notifications | `Notification` |

Gols e assistências ficam como contadores em `MatchPlayer` em vez de uma linha por gol: atende histórico, artilharia e rankings com consultas simples. Se um dia houver "minuto do gol", cria-se `Goal` sem quebrar nada.

"Atrasado" não é um status gravado: é `PENDING` com vencimento no passado, calculado na leitura (não fica dessincronizado).

## 4. Principais telas

Barra inferior fixa (mobile): **Início · Partidas · Jogadores · Rankings · Financeiro**.

| Tela | Organizador | Jogador |
|---|---|---|
| Início | Próxima partida (data, local, confirmados/pendentes/ausentes), financeiro do mês, mensalistas em dia/atrasados, atalhos | Próxima partida com botões VOU / NÃO VOU / NÃO SEI, seu status financeiro |
| Partidas | Lista + "Nova partida" | Lista |
| Partida | Presença (com troca manual de status), lista de espera, fechar lista, sortear times (aleatório/equilibrado), trocar jogadores de time, registrar resultado, votação do craque, compartilhar no WhatsApp | "Você vai jogar?", times, resultado, votar no craque |
| Jogadores | Lista, cadastro, edição, link de convite | Lista e perfil com estatísticas |
| Rankings | Artilharia, assistências, média, vitórias, partidas, craques, goleiros; filtro semana/mês/temporada/sempre | Igual |
| Financeiro | Previsto/recebido/pendente/atrasado, receita por mês, cobranças com filtros, registrar pagamento, gerar mensalidades | Só as próprias cobranças |
| Ajustes | Dados da pelada, convite, temporadas, plano | — |

## 5. Fluxos de usuário

1. **Organizador novo**: cadastro → "Criar minha pelada" (nome, local, dia/horário, valores) → cai no Início com um passo a passo de 3 itens (cadastrar jogadores, criar partida, convidar).
2. **Jogador convidado**: recebe link no WhatsApp → cria conta ou entra → "Quem é você nesta pelada?" (escolhe seu nome na lista ou "sou novo") → vê a próxima partida e confirma.
3. **Semana da pelada**: organizador cria partida → compartilha link → jogadores respondem → se lotar, novos entram na lista de espera; se alguém desiste, o primeiro da espera sobe automaticamente e é notificado → organizador fecha a lista → sorteia → compartilha os times.
4. **Pós-jogo**: organizador lança placar, gols, assistências, notas → finaliza → avulsos que jogaram recebem cobrança automaticamente → votação do craque abre → rankings atualizados.
5. **Mês**: organizador clica "Gerar mensalidades de <mês>" → marca pagamentos conforme recebe → manda cobrança dos pendentes pelo WhatsApp.

## 6. Possíveis problemas de UX (e como o MVP trata)

| Risco | Tratamento |
|---|---|
| Jogador não quer criar conta só para dizer "vou" | Organizador pode marcar presença por ele; cadastro curto (nome, e-mail, senha). *Próxima versão*: confirmação por link mágico sem senha. |
| Jogador duplicado ao entrar pelo convite | Tela "Quem é você?" lista cadastros ainda sem conta para ele reivindicar. |
| Nota de habilidade gerar atrito ("me deram 5?") | Nota só visível ao organizador; texto deixa claro que serve apenas para equilibrar os times. |
| Sorteio "injusto" | Dois modos, explicação do critério, força de cada time exibida, troca manual depois. |
| Lista de espera confusa | Posição numerada visível; promoção automática gera notificação. |
| Fuso horário (servidor em UTC) | Datas convertidas usando o fuso da pelada (padrão America/Sao_Paulo). |
| Organizador esquecer de gerar cobranças | Card no Início avisa quando as mensalidades do mês ainda não foram geradas. |
| Muitas funções na tela | Ações principais em botões grandes; telas por tarefa; administração escondida do jogador. |

## 7. Prioridade do MVP

**Entra na v1 (seção 24, na ordem):** cadastro/login (com recuperação de senha) · criar pelada · jogadores (com convite) · criar partida · presença + lista de espera · financeiro · sorteio aleatório/equilibrado com troca manual · resultado · estatísticas básicas · ranking básico.

**Entra também porque é barato e fecha o ciclo:** craque da partida (votação), histórico de partidas, temporadas, notificações no app, botões de WhatsApp, estrutura de planos.

**Fica para depois:** cobrança real (PIX/gateway e assinatura do SaaS), WhatsApp via API, push/e-mail de lembrete agendado, notas dadas pelos próprios jogadores, upload de foto em storage externo (v1 guarda miniatura comprimida), personalização visual da pelada (Premium), PWA/app nativo, convite por link mágico sem senha.
