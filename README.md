# HUX — E-commerce + Backoffice

Site institucional, loja online e painel de gestão para a **HUX** (vestuário de corrida).
`RUN · PERFORMANCE · LIFESTYLE`

Full-stack real — backend próprio, banco relacional, autenticação com hash + sessão JWT,
carrinho e checkout persistidos, pagamento via Pix e cálculo de frete. **Nada mocado.**

---

## Stack

| Camada        | Tecnologia |
|---------------|------------|
| Framework     | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilo        | Tailwind CSS v4 (design system HUX) |
| Banco         | Prisma ORM + SQLite (dev) — pronto para Postgres |
| Auth          | bcrypt (hash de senha) + JWT em cookie HTTP-only (`jose`) |
| Validação     | Zod |
| Pagamento     | Pix "copia e cola" (BR Code EMV com CRC16) + QR (`qrcode`) |
| Frete         | Regras por região/UF configuráveis + ViaCEP (autocomplete de endereço) |
| Gráficos      | Recharts |

Valores monetários são armazenados em **centavos (inteiros)**.

---

## Rodando localmente

```bash
npm install
npm run db:setup     # cria schema + seed + baixa fotos de exemplo dos produtos
npm run dev          # http://localhost:4100
```

`db:setup` = `db:push` + `db:seed` + `db:photos`. Se preferir passo a passo, rode cada um.
`db:photos` baixa fotos reais de vestuário de corrida (Unsplash, uso livre), curadas por
tipo de produto, para `public/products/photos`, e usa o pôster da marca como imagem final
da galeria. Idempotente e opcional — sem ele, os produtos exibem a arte gerada. Rode de
novo após `db:reset`. Para trocar por fotos oficiais: Backoffice → Produtos → editar →
campo de imagens (uma URL por linha).

Scripts úteis: `npm run db:studio` (Prisma Studio), `npm run db:reset` (recria + seed),
`npm run build` / `npm start` (produção).

---

## Acessos de teste (criados pelo seed)

**Backoffice** — `/backoffice`
| Usuário    | Senha      | Perfil    |
|------------|------------|-----------|
| `admin`    | `hux12345` | Admin (acesso total) |
| `gerente`  | `hux12345` | Gerente |
| `vendedor` | `hux12345` | Vendedor (permissões por módulo) |

**Loja (cliente)** — `/conta/login`
`cliente@hux.com.br` / `hux12345`

Cupons de exemplo: `BEMVINDO10` (10% off), `FRETEGRATIS` (frete grátis acima de R$250).

---

## Estrutura

```
src/
├── app/
│   ├── (site)/            # site público: home, loja, produto, coleções,
│   │   │                  #   checkout, sobre, tecnologia, contato, conta/*
│   ├── backoffice/        # painel de gestão (login + (panel)/*)
│   └── actions/           # server actions (cart, checkout, auth, backoffice-*)
├── components/            # site/, store/, cart/, checkout/, account/, orders/,
│   │                      #   backoffice/, ui/
├── lib/                   # db, auth, jwt, cart, orders, pricing, shipping,
│   │                      #   coupon, pix, poster, analytics, enums, money…
└── middleware.ts          # guarda de rota (edge) para /backoffice e /conta
prisma/
├── schema.prisma          # modelo de dados completo
├── seed.ts + catalog.ts   # dados iniciais + gerador de imagens (posters SVG)
```

## Módulos do backoffice
Dashboard (KPIs + gráficos + alertas), Pedidos (confirmar pagamento, avançar
status, rastreio, cancelar com devolução de estoque, **emitir recibo**),
**Boletos** (acompanhar vencimentos/parcelas e dar baixa), **Reservas**
(provisiona estoque + fechar venda em 1 clique), **Encomendas** (pedidos sob
medida por cliente), Produtos (CRUD + variantes), Estoque (entradas/saídas +
movimentações), Promoções, Cupons, Clientes, Notificações (broadcast), Frete
(regras por região), Configurações (usuários + matriz de permissões — só Admin).

## Pagamento — Pix, Boleto e Cartão
- **Pix** (manual): QR + copia-e-cola (BR Code EMV real).
- **Boleto** (manual): parcelado em até 3x, com vencimentos e linha digitável
  (placeholder até integrar a PagSeguro). O gerente dá baixa em **Boletos**; ao
  quitar todas as parcelas o pedido vira `PAGO` automaticamente.
- **Cartão de crédito**: reservado para a integração **PagSeguro** (aparece como
  "em breve" no checkout).
- **Recibo**: emitido pelo backoffice em cada pedido (`/backoffice/recibo/<num>`),
  imprimível/PDF, com itens, totais, forma de pagamento e — no boleto — a tabela
  de parcelas e vencimentos.

Identidade: verde-limão **#C6FF00** (marca), logo com o **X** verde. Base preta/grafite.

Controle de acesso (spec HUX): `admin` = tudo; `gerente` = tudo exceto Config;
`vendedor` = módulos configuráveis por conta.

---

## Pagamento (Pix manual) — como funciona hoje e como virar automático

O checkout gera um **Pix copia-e-cola real (BR Code EMV)** + QR Code. O pedido entra
como `AGUARDANDO_PAGAMENTO`; quando o gerente identifica o pagamento, clica em
**"Confirmar pagamento Pix"** no backoffice → o pedido vira `PAGO`, o estoque já foi
baixado na criação, e o cliente recebe uma notificação.

O fluxo foi construído com uma camada de abstração (`src/lib/pix.ts` +
`createOrder`/`transitionOrder`). Para plugar um **gateway automático** (Mercado
Pago, Stripe, Pagar.me…) no futuro: criar o adapter que gera a cobrança e um
webhook que chama `transitionOrder(orderId, "PAGO")` na confirmação. Nenhuma outra
parte do fluxo muda.

Configure a chave de recebimento em `.env`:
```
PIX_KEY="sua-chave-pix"
PIX_MERCHANT_NAME="HUX RUN LTDA"
PIX_MERCHANT_CITY="SAO PAULO"
```

## Frete
Sem custo/integração externa: regras configuráveis no backoffice (valor por UF,
frete grátis acima de X, prazo). O CEP é resolvido pelo **ViaCEP** (gratuito). Para
cotação em tempo real (Correios/Melhor Envio), basta adicionar um adapter em
`src/lib/shipping.ts` quando houver conta/contrato.

---

## Migração para produção (Postgres)
1. Trocar `provider = "postgresql"` em `prisma/schema.prisma` e apontar `DATABASE_URL`.
2. `npx prisma migrate deploy`.
3. Definir `AUTH_SECRET` forte e as variáveis `PIX_*`.
4. Uploads de imagem de produto: hoje novos produtos sem foto geram uma arte SVG em
   `public/products`. Em serverless, trocar por um storage (S3/Blob) no `upsertProductAction`.
