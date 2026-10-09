# 🏐 Placar Vôlei

Placar ao vivo, tabela, chaveamento e notificações para os Esportes da Diocese.
Next.js 15 + Supabase (Postgres + Realtime) + Web Push. Visual "Liquid Glass", mobile-first e pronto para tablet.

- **`/`** — jogadores: placar ao vivo, jogos, tabela dos grupos, chave e "Meu time" (quantas partidas faltam + notificações).
- **`/juiz`** — juiz (protegido por senha): placar com cronômetro, fila de jogos (reordenar, editar pontos/tempo/times), chave, nomes dos times e "Notificar próximos".

## Regras implementadas
| Fase | Pontos | Tempo |
|---|---|---|
| Grupos A–C | 10 | 8 min |
| Grupo D | 10 | 10 min |
| Quartas / Semis | 12 | 10 min |
| 3º e 4º | 15 | 15 min |
| Final | 21 | 20 min |

Editáveis por partida (Juiz → Jogos → tocar no jogo). Set único, ponto corrido. Fim do tempo: vence quem lidera; empate = ponto de ouro.
Classificação: vitórias > saldo > pontos feitos > confronto direto. Quartas: 1A×2B, 1C×2D, 1B×2A, 1D×2C, preenchidas automaticamente quando cada grupo termina (o juiz pode trocar os times manualmente).

## Passo a passo

### 1. Supabase
1. Crie um projeto em https://supabase.com.
2. **SQL Editor** → cole e rode `supabase/migrations/0001_init.sql`.
3. **SQL Editor** → cole e rode `supabase/seed.sql` (cria os 11 times e os 18 jogos; rodar de novo **zera** o campeonato).
4. **Project Settings → API**: copie `Project URL`, `anon public` e `service_role` (secreta).

### 2. Chaves de notificação (VAPID)
```bash
npx web-push generate-vapid-keys
```

### 3. Vercel
1. Suba este repositório no GitHub e importe na Vercel.
2. Configure as variáveis de ambiente (veja `.env.example`):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (nunca expor) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key do passo 2 |
| `VAPID_PRIVATE_KEY` | Private Key do passo 2 |
| `VAPID_SUBJECT` | `mailto:seu@email.com` |
| `JUIZ_PASSWORD` | senha do juiz |
| `JUIZ_SESSION_SECRET` | `openssl rand -hex 32` |

3. Deploy. Juiz acessa `https://seu-app.vercel.app/juiz`.

### Local
```bash
cp .env.example .env.local   # preencha
npm install
npm run dev     # http://localhost:3000
npm test        # testes da lógica (classificação, chave, fila, cronômetro)
```

## Notificações
- Android/Chrome/desktop: "Meu time" → escolher time → **Ativar notificações**.
- iPhone/iPad (iOS 16.4+): Safari → Compartilhar → **Adicionar à Tela de Início**, abrir pelo ícone e ativar.
- Disparos automáticos ao encerrar cada partida: "Vocês são os próximos!" (próximo jogo) e "Falta 1 jogo" (o seguinte). O juiz também pode usar o sino (próximos) ou "Chamar times" em um jogo específico.
