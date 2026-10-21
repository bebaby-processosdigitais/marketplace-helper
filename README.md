# Marketplace Helper

Aplicação web para vendedores do Mercado Livre: puxa os anúncios via API e gera
relatórios e dashboards (fretes, comissões, preços/promoções), com exportação para Excel.

## Funcionalidades

- **Multiusuário** — login/cadastro por loja (e-mail + senha); cada usuário só vê os próprios dados.
- **Anúncios** — listagem paginada (50/pág) com busca por MLB, título ou SKU e ordenação por coluna.
- **Atualizar** — sincroniza todos os anúncios ou apenas uma seleção, em background com barra de progresso.
- **Preços e promoções** — captura preço de/por via endpoint de preços (promoções de canal).
- **Frete** — custo de frete por anúncio (com CEP configurável).
- **Comissão** — tarifa de venda (percentual + custo fixo) e "Custo ML" (comissão + frete).
- **Dashboard** — fretes mais caros, fretes que mudaram, médias e totais.
- **Regras de Negócio** — cadastro de impostos/custos (ICMS, IPI, DIFAL, Custo Operacional).
- **Exportar Excel** — exporta a lista (respeitando o filtro) em `.xlsx`.
- **Autorização** — fluxo OAuth com o Mercado Livre.

## Stack

- Node.js + Express
- EJS + Bootstrap 5 (tema minimalista — ver `design.md`)
- Prisma ORM + SQLite
- ExcelJS

## Como rodar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` a partir do exemplo e defina um `SESSION_SECRET` aleatório:

   ```bash
   cp .env.example .env
   ```

   ```
   PORT=3333
   SESSION_SECRET=um_valor_aleatorio_longo
   DATABASE_URL="file:./dev.db"
   ```

   As credenciais do Mercado Livre (App ID, Secret, Redirect URI) são cadastradas
   por cada usuário dentro do app, na tela **Autorização**.

3. Prepare o banco:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Inicie:

   ```bash
   npm start
   ```

   Acesse `http://localhost:3333`. No Windows, o `INICIAR.BAT` faz tudo isso e abre no Chrome.

## Primeiro acesso

1. Acesse `http://localhost:3333`, crie sua conta (nome da loja, e-mail e senha).
2. Em **Autorização**, cadastre o App ID, o Secret e o Redirect URI do seu app do Mercado Livre (Passo 1).
3. Clique em "Autorizar no Mercado Livre", conclua o login e cole o código (ou a URL de retorno) (Passo 2).
4. Volte em **Anúncios** e clique em **Atualizar tudo**. O token é salvo e renovado automaticamente.

## Estrutura

```
src/
  config/       env, prisma
  controllers/  auth, items, sync, dashboard, export, rules
  services/     mlAuth, mlApi, syncService, itemService, dashboardService, exportService, rulesService
  routes/       index.js
  views/        ejs (anúncios, dashboard, regras, auth)
public/         css, js
prisma/         schema + migrations
```

## Licença

Uso interno.
