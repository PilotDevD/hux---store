# Deploy da HUX no Netlify (site + loja + backoffice, tudo funcionando)

O Netlify roda em **serverless**, então o banco não pode ser SQLite (arquivo). Usamos
**PostgreSQL hospedado** (Neon, plano grátis). O código já está 100% pronto — siga os
passos abaixo. Tempo estimado: ~15 min.

---

## 1) Criar o banco (Neon — grátis)

1. Acesse **https://neon.tech** e crie uma conta (pode logar com o Google).
2. **Create project** → nome `hux`, região mais próxima (ex.: AWS São Paulo / US East).
3. No projeto, abra **Connect** / **Connection Details** e copie **duas** strings:
   - **Pooled connection** (o host contém `-pooler`) → será a `DATABASE_URL`
   - **Direct connection** (sem `-pooler`) → será a `DIRECT_URL`
   - Garanta que ambas terminam com `?sslmode=require`.

## 2) Popular o banco (uma vez, do seu PC)

Na pasta do projeto, edite o arquivo `.env` e cole as duas URLs em `DATABASE_URL`
e `DIRECT_URL`. Depois rode:

```bash
npm install
npm run db:push      # cria as tabelas no Neon
npm run db:seed      # cria admin, produtos, frete, cupons, cliente demo
npm run db:photos    # aplica as fotos reais aos produtos
```

> Dica: gere um `AUTH_SECRET` forte e coloque no `.env` (e depois no Netlify):
> `openssl rand -base64 32`

Teste localmente (`npm run dev` → http://localhost:4100) para confirmar que o banco
Neon está respondendo.

## 3) Subir o código para o GitHub

O projeto já está com git iniciado e um commit pronto. Crie um repositório vazio no
GitHub (ex.: `hux-store`, **privado**) e rode:

```bash
git remote add origin https://github.com/SEU_USUARIO/hux-store.git
git branch -M main
git push -u origin main
```

## 4) Criar o site no Netlify

1. Acesse **https://app.netlify.com** → **Add new site → Import an existing project**.
2. Conecte o GitHub e selecione o repositório `hux-store`.
3. O Netlify detecta o Next.js automaticamente (via `netlify.toml`):
   - Build command: `npm run build`
   - Plugin: `@netlify/plugin-nextjs` (já configurado)
4. **Antes de finalizar**, em **Site settings → Environment variables**, adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a string **pooled** do Neon |
| `DIRECT_URL` | a string **direct** do Neon |
| `AUTH_SECRET` | string longa aleatória (a mesma do passo 2) |
| `NEXT_PUBLIC_SITE_URL` | a URL do site (ex.: `https://hux.netlify.app`) |
| `NEXT_PUBLIC_SITE_NAME` | `HUX` |
| `PIX_KEY` | sua chave Pix (ex.: `contato@hux.com.br`) |
| `PIX_MERCHANT_NAME` | `HUX RUN LTDA` |
| `PIX_MERCHANT_CITY` | `SAO PAULO` |

5. Clique em **Deploy**. Em ~2–3 min o site estará no ar na URL do Netlify.

> Depois do 1º deploy, volte em `NEXT_PUBLIC_SITE_URL` e coloque a URL real do site,
> e faça um **redeploy** (Deploys → Trigger deploy).

## 5) Testar (o que o cliente vai usar)

- **Site + Loja**: navegue, filtre, abra produto, calcule frete, adicione à sacola.
- **Cliente**: `cliente@hux.com.br` / `hux12345` (ou cadastre um novo).
  - Checkout com **Pix** e com **Boleto** (parcelado), acompanhar pedido/rastreio.
- **Backoffice** (`/backoffice`): `admin` / `hux12345`
  - Pedidos (confirmar pagamento, emitir recibo), Boletos (dar baixa), Reservas
    (fechar venda), Encomendas, Produtos/Estoque, Promoções, Cupons, Clientes,
    Notificações, Frete, Configurações.

---

## Alternativa via Netlify CLI (sem GitHub)
```bash
npm i -g netlify-cli
netlify login
netlify init         # cria o site
# defina as env vars (passo 4) em: netlify env:set NOME valor
netlify deploy --build --prod
```

## Observações
- **Cartão de crédito**: aparece como "em breve" — habilita com a integração PagSeguro.
- **Boleto/Pix**: são manuais (o gerente dá baixa). Prontos para plugar um gateway real.
- Imagens de produto são arquivos estáticos versionados em `public/products/`.
- Para produção real (não só teste), troque `AUTH_SECRET`, `SEED_ADMIN_PASSWORD`
  e as senhas dos usuários no backoffice.
