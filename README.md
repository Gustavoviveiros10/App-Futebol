# Jogus Connect — o administrador da sua pelada

> "Você organiza a pelada. O aplicativo cuida do resto."

SaaS multi-tenant para organizar peladas semanais: presença com lista de espera, sorteio de times equilibrado, financeiro (mensalistas e avulsos), resultado, estatísticas, craque da partida e rankings. Mobile-first, com botões de compartilhar no WhatsApp em todas as etapas.

O planejamento (arquitetura, banco, telas, fluxos, riscos de UX e prioridades) está em [`docs/PLANEJAMENTO.md`](docs/PLANEJAMENTO.md).

## Tecnologias

- **Next.js 16** (App Router, Server Components e Server Actions) + **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL** + **Prisma 6** (migrations versionadas)
- Autenticação própria: senha com **bcrypt**, sessão em banco com cookie httpOnly (token guardado como hash SHA-256), recuperação de senha por link de uso único (1 h)
- **Zod** para validar toda entrada no servidor
- E-mail plugável: console em dev, **Resend** se `RESEND_API_KEY` existir

## Estrutura

```
prisma/
  schema.prisma        # modelo de dados
  migrations/          # migrations SQL
  seed.ts              # pelada de demonstração
src/
  app/
    (auth)/            # login, cadastro, recuperar/redefinir senha
    app/               # minhas peladas, criar pelada
    convite/[code]/    # entrada de jogadores pelo link
    p/[gid]/           # tudo dentro de uma pelada (tenant)
      page.tsx         #   Início (dashboard)
      partidas/        #   lista, criar, partida (presença/times/resultado), resultado
      jogadores/       #   lista, cadastro, perfil com estatísticas
      rankings/
      financeiro/
      ajustes/         #   dados da pelada, convite, temporadas, plano, conta
      notificacoes/
  lib/
    auth.ts            # sessões e senha
    tenancy.ts         # getMembership / requireOrganizer (isolamento por pelada)
    attendance.ts      # presença + lista de espera com promoção automática
    draw.ts            # algoritmo de sorteio (com testes)
    finance.ts         # cobranças, resumo do mês, atrasos
    stats.ts           # estatísticas e rankings
    plans.ts           # planos e limites (Gratuito / Pro / Premium)
    notify.ts          # notificações (ponto único para futuro WhatsApp/push)
    share.ts           # textos prontos para o WhatsApp
```

## Segurança e multi-tenant

- Cada pelada é um tenant. Um usuário pode ser organizador de uma e jogador de outra (`Player` liga `User` ↔ `Group` com papel).
- Toda página em `/p/[gid]` passa por `getMembership`: sem vínculo ativo, responde 404.
- Toda Server Action chama `requireMember`/`requireOrganizer` e filtra por `groupId`; ids de outra pelada são rejeitados.
- Jogador comum não vê telas administrativas nem o nível (nota) dos outros; vê só o próprio financeiro.
- A lista de espera usa trava de linha (`SELECT ... FOR UPDATE`) para duas pessoas não pegarem a mesma vaga.

## Rodar localmente

Requisitos: Node 20+ e um PostgreSQL (local ou na nuvem).

```bash
cp .env.example .env          # ajuste DATABASE_URL e DIRECT_URL
npm install
npx prisma migrate dev        # cria as tabelas
npm run db:seed               # opcional: pelada de demonstração
npm run dev                   # http://localhost:3000
```

Logins da demonstração (após o seed): `organizador@demo.com` / `demo1234` e `jogador@demo.com` / `demo1234`.

Sem `RESEND_API_KEY`, o link de recuperação de senha aparece no log do servidor.

Testes do algoritmo de sorteio: `npm test`. Checagem de tipos: `npm run lint`.

## Deploy (Vercel + Postgres gerenciado)

1. Crie um banco PostgreSQL (Neon, Supabase ou Railway). Copie a URL com pooler para `DATABASE_URL` e a URL direta para `DIRECT_URL` (no Neon/Supabase são duas URLs; em um Postgres comum use a mesma nas duas).
2. Suba este código para um repositório no GitHub e importe na [Vercel](https://vercel.com/new).
3. Em *Settings → Environment Variables*, configure `DATABASE_URL`, `DIRECT_URL`, `APP_URL` (ex.: `https://suapelada.vercel.app`) e, se quiser e-mail real, `RESEND_API_KEY` e `MAIL_FROM`.
4. Faça o deploy. O script `vercel-build` roda `prisma migrate deploy` antes do build, então as tabelas são criadas/atualizadas automaticamente.

Outros provedores (Railway, Render, VPS): `npm install && npm run db:deploy && npm run build && npm start`.

## Próximas versões

- Assinatura real do SaaS (Stripe/Mercado Pago/Asaas) — `Subscription.provider/externalId` já existem
- PIX automático nas cobranças — `Payment.provider/externalId` já existem
- WhatsApp via API e lembretes agendados — `lib/notify.ts` é o ponto de integração
- Notas dadas pelos próprios jogadores, perfil de goleiro mais completo
- Upload de foto em storage (v1 guarda miniatura comprimida no banco)
- PWA instalável e notificações push
- Personalização visual da pelada (Premium)
- Limite de tentativas de login (rate limiting)
