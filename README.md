# Marketplace Helper

Aplicação web para vendedores do Mercado Livre: puxa os anúncios via API e gera
relatórios e dashboards (fretes, comissões, preços/promoções), com exportação para Excel.

## Funcionalidades

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

2. Crie o arquivo `.env` a partir do exemplo e preencha as credenciais do seu app do Mercado Livre:

   ```bash
   cp .env.example .env
   ```

   ```
   ML_APP_ID=seu_app_id
   ML_APP_SECRET=seu_app_secret
   ML_REDIRECT_URI=https://seu-dominio/redirect
   PORT=3333
   DATABASE_URL="file:./dev.db"
   ```

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

## Autorização

Na tela **Autorização**, clique em "Autorizar no Mercado Livre", conclua o login e cole o
código (ou a URL de retorno) para conectar. O token é salvo e renovado automaticamente.

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
