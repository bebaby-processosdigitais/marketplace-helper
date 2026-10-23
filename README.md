# Marketplace Helper

> Plataforma web de **inteligência de rentabilidade** para vendedores do Mercado Livre.
> Importa os anúncios via API oficial, calcula **lucro, margem, comissão e frete** de cada item,
> simula cenários de precificação e aponta, por meio de indicadores e *insights*, o que precisa
> de correção no catálogo.

Aplicação **Node.js / Express** com renderização no servidor (**EJS + Bootstrap 5**), persistência
via **Prisma ORM** sobre **SQLite**, arquitetura **MVC em camadas** e multiusuário com isolamento
de dados. Acompanha uma **landing page** comercial independente.

---

## Sumário

1. [Visão geral e motivação](#1-visão-geral-e-motivação)
2. [Arquitetura e decisões de projeto](#2-arquitetura-e-decisões-de-projeto)
3. [Pilha tecnológica](#3-pilha-tecnológica)
4. [Estrutura de diretórios](#4-estrutura-de-diretórios)
5. [Modelo de dados](#5-modelo-de-dados)
6. [Autenticação e sessão](#6-autenticação-e-sessão)
7. [Integração com a API do Mercado Livre](#7-integração-com-a-api-do-mercado-livre)
8. [Regras de negócio e cálculo financeiro](#8-regras-de-negócio-e-cálculo-financeiro)
9. [Funcionalidades por módulo](#9-funcionalidades-por-módulo)
10. [Sincronização e agendamento](#10-sincronização-e-agendamento)
11. [Segurança](#11-segurança)
12. [Landing page](#12-landing-page)
13. [Mapa de rotas](#13-mapa-de-rotas)
14. [Variáveis de ambiente](#14-variáveis-de-ambiente)
15. [Passo a passo: executar em uma nova máquina](#15-passo-a-passo-executar-em-uma-nova-máquina)
16. [Scripts disponíveis](#16-scripts-disponíveis)
17. [Solução de problemas](#17-solução-de-problemas)
18. [Limitações conhecidas e trabalhos futuros](#18-limitações-conhecidas-e-trabalhos-futuros)
19. [Licença](#19-licença)

---

## 1. Visão geral e motivação

Vender no Mercado Livre envolve custos que corroem a margem e raramente são contabilizados em
tempo real: **comissão** (tarifa de venda, variável por categoria e tipo de anúncio), **frete**
(que o vendedor subsidia nas faixas de frete grátis), **impostos** (ICMS, IPI, DIFAL) e o **custo
operacional**. Sem consolidar esses fatores, o vendedor frequentemente descobre que opera no
prejuízo apenas no fechamento do mês.

O **Marketplace Helper** resolve esse problema reunindo, para cada anúncio:

- preço de venda (inclusive promocional),
- custo do produto (informado pelo vendedor, por SKU),
- comissão real (via API),
- frete real (via API),
- impostos (parametrizados pelo vendedor),

e derivando **lucro líquido** e **margem**. Sobre esses dados, a aplicação constrói um painel com
indicadores-chave (KPIs) **clicáveis**, *insights* acionáveis, um simulador de precificação, uma
**calculadora de frete** (cubagem) e exportação para Excel.

---

## 2. Arquitetura e decisões de projeto

A aplicação adota o padrão **MVC** complementado por uma **camada de serviços** (lógica de
domínio), resultando em quatro responsabilidades bem separadas:

```
Requisição HTTP
      │
      ▼
 [ Rotas ] ──► [ Middleware de autenticação ] ──► [ Controllers ]
                                                        │
                                                        ▼
                                                  [ Services ]  ◄──► [ Prisma / SQLite ]
                                                        │                    ▲
                                                        ▼                    │
                                                 [ API Mercado Livre ]       │
                                                        │                    │
                                                        ▼                    │
                                                  [ Views EJS ] ─────────────┘ (dados renderizados)
```

- **Rotas** (`src/routes/index.js`): declaram os *endpoints* e aplicam o middleware de autenticação.
- **Controllers** (`src/controllers/`): orquestram a requisição — leem parâmetros, chamam serviços
  e escolhem a *view* ou a resposta JSON. Não contêm regra de negócio.
- **Services** (`src/services/`): concentram a lógica de domínio (cálculos, acesso à API externa,
  consultas ao banco). São reutilizáveis e testáveis isoladamente.
- **Views** (`src/views/`): *templates* EJS renderizados no servidor.

**Decisões de projeto relevantes:**

- **Renderização no servidor (SSR) com EJS**, em vez de SPA. Justificativa: a aplicação é
  orientada a formulários e tabelas densas, com pouca interatividade cliente-lado; o SSR reduz
  complexidade, elimina *build* de *frontend* e entrega HTML pronto.
- **SQLite via Prisma.** Para uma ferramenta de uso local, o SQLite é *zero-config* (um único
  arquivo `dev.db`), e o Prisma fornece *schema* declarativo, migrações versionadas e um cliente
  tipado. A troca futura para PostgreSQL exige apenas alterar o *datasource*.
- **Isolamento multiusuário por `userId`.** Toda entidade de dados referencia o usuário dono;
  todas as consultas são escopadas, garantindo que um usuário jamais veja dados de outro.
- **Cálculos derivados sob demanda.** Margem, lucro e "Custo ML" não são persistidos: são
  calculados a cada leitura a partir dos campos base e das regras vigentes, de modo que uma
  mudança de alíquota se reflete imediatamente, sem recomputar o catálogo.

---

## 3. Pilha tecnológica

| Camada | Tecnologia | Papel |
|---|---|---|
| Runtime | **Node.js 24** (ESM) | Ambiente de execução |
| Servidor web | **Express 4** | Roteamento e *middleware* |
| Templates | **EJS** + **Bootstrap 5** (CDN) + **Bootstrap Icons** + **Inter** | Renderização e UI |
| ORM / banco | **Prisma 6** + **SQLite** | Persistência e migrações |
| Autenticação | **bcryptjs** (hash de senha) + **cookie-session** (sessão) | Login e sessão |
| Criptografia | **node:crypto** (AES-256-GCM) | Dados sensíveis em repouso |
| Agendamento | **node-cron** | Sincronização automática |
| Exportação | **ExcelJS** | Geração de `.xlsx` |
| Configuração | **dotenv** | Variáveis de ambiente |

---

## 4. Estrutura de diretórios

```
dashboard ML/
├── prisma/
│   ├── schema.prisma          # Definição do modelo de dados
│   ├── migrations/            # Histórico de migrações versionadas
│   └── dev.db                 # Banco SQLite (NÃO versionado)
├── public/
│   ├── css/style.css          # Tema (design system) da aplicação
│   ├── js/app.js              # JS do cliente (sync, seleção, custos, olho de senha)
│   └── js/frete-calc.js       # Calculadora de frete (cubagem + tabela do ML, cliente-lado)
├── src/
│   ├── config/
│   │   ├── env.js             # Carrega e valida variáveis de ambiente
│   │   ├── prisma.js          # Instância única (singleton) do Prisma Client
│   │   └── crypto.js          # Criptografia AES-256-GCM (encrypt/decrypt)
│   ├── middleware/
│   │   └── auth.js            # requireAuth: exige login, carrega req.user
│   ├── controllers/           # Orquestração das requisições (um por domínio)
│   ├── services/              # Lógica de domínio (ver abaixo)
│   ├── views/                 # Templates EJS (+ partials: head, nav, footer)
│   ├── routes/index.js        # Declaração central das rotas
│   ├── scheduler.js           # Cron de sincronização (00:00 e 12:00)
│   └── server.js              # Ponto de entrada (Express + sessão + scheduler)
├── marketplace helper LP/     # Landing page comercial (site estático independente)
│   ├── index.html · styles.css · config.js · server.js · INICIAR-LP.BAT
├── .env                       # Segredos locais (NÃO versionado)
├── .env.example               # Modelo das variáveis de ambiente
├── INICIAR.BAT                # Inicializador para Windows (app principal)
├── design.md                  # Guia do design system
└── README.md
```

**Serviços (`src/services/`):**

| Arquivo | Responsabilidade |
|---|---|
| `accountService.js` | Criação de usuário, verificação e troca de senha, validação de senha |
| `mlAuth.js` | Credenciais do app ML, fluxo OAuth, *tokens*, criptografia desses dados |
| `mlApi.js` | Chamadas à API do Mercado Livre (itens, preços, frete, comissão, visitas, categoria) |
| `syncService.js` | Orquestração da sincronização e *upsert* dos anúncios; estado de progresso |
| `itemService.js` | Listagem paginada/ordenada dos anúncios e **filtros rápidos** dos KPIs (`?filter=`) |
| `calcService.js` | Cálculo de lucro/margem (`computeProfit`) e saúde do anúncio (`computeHealth`) |
| `dashboardService.js` | Agregações, KPIs e *insights* do painel |
| `productService.js` | Agrupamento por SKU e preenchimento de custo em lote |
| `rulesService.js` | Regras de negócio (ICMS, IPI, DIFAL, custo operacional) |
| `simulatorService.js` | Simulação de anúncio (categoria, comissão, frete, retorno) |
| `exportService.js` | Geração da planilha Excel |

---

## 5. Modelo de dados

Definido em `prisma/schema.prisma`. Seis entidades, todas (exceto `User`) escopadas a um usuário.

```
User 1───1 MlAccount          (credenciais do app ML + tokens OAuth, cifrados)
 │   1───1 Settings           (CEP de frete, data da última sincronização)
 │   1───1 BusinessRule       (alíquotas de ICMS, IPI, DIFAL, custo operacional)
 │   1───N Item               (anúncios do vendedor)
                 │
                 1───N ShippingHistory  (histórico de frete por item)
```

| Entidade | Campos principais | Observações |
|---|---|---|
| **User** | `email` (único), `storeName`, `whatsapp`, `passwordHash` | Senha com hash bcrypt |
| **MlAccount** | `appId`, `appSecret`, `redirectUri`, `accessToken`, `refreshToken`, `mlUserId` | `appSecret` e *tokens* **cifrados** (AES-256-GCM) |
| **Settings** | `zipCode`, `lastSyncAt` | CEP usado no cálculo de frete |
| **BusinessRule** | `icms`, `ipi`, `difal`, `custoOperacional` | Percentuais (%) |
| **Item** | `mlb`, `sku`, `titulo`, `thumbnail`, `permalink`, `custoProduto`, `precoDe`, `precoPor`, `frete`, `comissao`, `comissaoPct`, `visitas`, `vendas`, `estoque`, `status`, `full`, `catalogo`, categorias | Único por `(userId, mlb)` |
| **ShippingHistory** | `mlb`, `cost`, `capturedAt` | Permite detectar mudanças de frete |

---

## 6. Autenticação e sessão

Dois níveis de autenticação coexistem:

1. **Autenticação do usuário na aplicação.** Cadastro com e-mail, nome da loja, WhatsApp e senha.
   A senha é validada (mínimo 8 caracteres, ao menos 1 maiúscula e 1 número) e armazenada como
   **hash bcrypt** (10 *rounds*). A sessão é mantida por **cookie assinado** (`cookie-session`),
   guardando apenas o `userId`. O *middleware* `requireAuth` protege todas as rotas internas,
   carregando `req.user` e disponibilizando dados globais às *views* (nome da loja, última sync).

2. **Autorização junto ao Mercado Livre (OAuth 2.0).** Cada usuário cadastra as credenciais do seu
   **aplicativo** no Mercado Livre (App ID, Secret, Redirect URI) na tela *Autorização*, autoriza o
   acesso e cola o `code` de retorno. A aplicação troca o `code` por `access_token` e
   `refresh_token`, renovando-os automaticamente quando expiram.

A recuperação de senha por e-mail existe como **placeholder** (interface pronta, envio de e-mail
ainda não configurado).

---

## 7. Integração com a API do Mercado Livre

A camada `mlApi.js` encapsula as chamadas. Cada requisição usa o *token* válido do usuário
(renovado se necessário) e trata *rate limit* (HTTP 429) e erros transitórios com *retry*; erros
definitivos (4xx) não são repetidos.

| Endpoint | Uso |
|---|---|
| `POST /oauth/token` | Troca de `code` e renovação de *token* |
| `GET /users/me` | Dados do vendedor (nickname, reputação, foto, vendas) |
| `GET /users/{id}/items/search?search_type=scan` | Lista **todos** os MLBs (paginação por *scroll*) |
| `GET /items?ids=...&include_attributes=all` | Detalhes de até 20 itens por chamada (*multiget*) |
| `GET /items/{mlb}/prices` | Preços e **promoções** ativas |
| `GET /items/{mlb}/shipping_options?zip_code=` | Custo de **frete** por CEP |
| `GET /visits/items?ids={mlb}` | **Visitas** (apenas 1 item por chamada) |
| `GET /sites/MLB/listing_prices?...` | **Comissão** (tarifa de venda) por preço/categoria/tipo |
| `GET /sites/MLB/domain_discovery/search?q=` | Predição de **categoria** a partir do título |
| `GET /categories/{id}` | Caminho da categoria (com cache) |

**Particularidades tratadas (notas de implementação):**

- **Promoções:** o campo `original_price` do item vem nulo em promoções de canal; a promoção real
  é obtida em `/items/{mlb}/prices` (tipo `promotion`, respeitando a janela de validade).
- **Frete:** anúncios **pausados/fechados** retornam 404 no cálculo de frete (sem estoque para
  cotar). Para itens de baixo valor, aplica-se a tabela fixa de contribuição do ML.
- **Visitas:** o endpoint passou a aceitar **apenas 1 ID por chamada**; a sincronização consulta
  item a item.
- **Busca pública** (`/sites/MLB/search`) está **bloqueada (403)** para aplicativos; por isso o
  simulador estima frete a partir dos **próprios anúncios** do usuário na mesma categoria.
- **Link do anúncio:** usa-se o `permalink` oficial retornado pela API (a rota `/anuncio/MLB...`
  não existe).

---

## 8. Regras de negócio e cálculo financeiro

O cálculo central está em `calcService.js::computeProfit(item, rules)`:

```
base      = precoPor  (se houver promoção)  |  precoDe  (caso contrário)
impostos  = base × (ICMS + IPI + DIFAL + Custo Operacional) / 100
lucro     = base − custoProduto − comissão − frete − impostos
margem    = lucro / base × 100
custoML   = comissão + frete            (quanto o Mercado Livre "consome")
```

As alíquotas vêm da entidade `BusinessRule` (tela *Regras*). O custo do produto é informado pelo
vendedor (tela *Produtos*, por SKU).

**Saúde do anúncio** (`computeHealth`) — avaliada em ordem, exibindo o primeiro estado aplicável:

`Inativo` (status ≠ ativo) → `Sem estoque` (estoque ≤ 0) → `Preencher custo` (custo ausente) →
`Prejuízo` (margem < 0) → `Margem baixa` (margem < 8%) → `Saudável`.

O limiar de **8%** separa, em toda a aplicação, o **alto desempenho** (margem ≥ 8%) do **baixo
desempenho** (0% ≤ margem < 8%).

---

## 9. Funcionalidades por módulo

- **Dashboard** (`/` — **página principal**; também em `/dashboard`): é a tela de entrada da
  aplicação e o destino do logo. Reúne **KPIs clicáveis** organizados em três grupos, em que cada
  cartão abre a lista de anúncios já filtrada:
  - *Desempenho*: nº **no prejuízo**, **baixo desempenho** (0–8%), **alto desempenho** (≥ 8%) e
    **no catálogo**;
  - *Estoque & cadastro*: **estoque baixo** (≤ 5, ativos), **Full com estoque baixo**, **sem custo**
    e **ticket médio**;
  - *Saúde financeira*: **custo médio do ML** (comissão + frete sobre o preço, %), **lucro líquido
    médio**, **margem média** e **cobertura de custo**.

  Traz ainda a seção de **insights** acionáveis (também com *deep-link* para a lista filtrada),
  **últimos anúncios** em cards com cálculo e saúde, distribuição por tipo/Full/Catálogo e análises
  de frete.
- **Anúncios** (`/anuncios`): tabela densa com busca (MLB/título/SKU), ordenação por coluna e
  **cabeçalho fixo**. No desktop há um **alternador de visualização** entre *planilha* e *cards*
  (os cards em grade, mesmo layout do mobile; a escolha é lembrada no navegador); no mobile é sempre
  em cards. Aceita **filtros rápidos** vindos dos KPIs do dashboard (`?filter=`), com *chip* do
  filtro ativo e botão de limpar. Permite **seleção** para sincronizar um subconjunto e **exportar
  para Excel**. O selo de **Full** aparece como um *badge* verde com raio.
- **Produtos** (`/produtos`): agrupa os anúncios por **SKU**. Preencher o custo de um SKU o aplica
  a **todos** os anúncios daquele produto. Busca por SKU, nome ou MLB.
- **Calculadora de Frete** (`/frete`): calcula a **cubagem** (peso volumétrico = L × A × C ÷ 6000),
  usa o **maior** entre peso real e peso cubado e, com o preço de venda, consulta o **custo de
  envio** na tabela oficial do Mercado Livre (MercadoLíder / reputação verde / sem reputação).
  Mostra o resultado em tempo real e destaca a célula correspondente na tabela de referência. É um
  cálculo **cliente-lado** (`public/js/frete-calc.js`), sem chamadas à API.
- **Regras** (`/regras`): cadastro das alíquotas, com explicação do cálculo e um **exemplo
  dinâmico** usando os valores do próprio usuário.
- **Simulador** (`/simulador`): a partir de um título e preço, prediz a categoria, calcula a
  comissão no **Clássico** e no **Premium**, estima o frete e compara o retorno lado a lado.
- **Autorização** (`/auth`): cadastro das credenciais do app ML e fluxo de autorização.
- **Minha Conta** (`/conta`): edição de nome da loja, e-mail e WhatsApp; troca de senha; e um
  cartão com os **dados e a foto** da conta do Mercado Livre.

---

## 10. Sincronização e agendamento

A sincronização (`syncService.js`) percorre todos os anúncios do vendedor, buscando detalhes,
preços, frete, comissão, visitas e categoria, e faz *upsert* em `Item`. Executa **em segundo
plano**, expondo o progresso via `GET /sync/status` (consumido por *polling* na interface).

Salvaguardas: não sobrescreve um valor válido (frete/comissão) por nulo em caso de falha
transitória; registra `Settings.lastSyncAt` ao concluir.

O `scheduler.js` (node-cron) dispara a sincronização de **todas as contas autorizadas** à
**meia-noite (00:00)** e ao **meio-dia (12:00)** — `cron: 0 0,12 * * *`. Por ser um aplicativo
local, o agendamento só ocorre com o servidor em execução.

---

## 11. Segurança

- **Senhas:** *hash* **bcrypt** (irreversível, com *salt*). Nunca armazenadas ou exibidas em claro.
- **Dados sensíveis do Mercado Livre:** `appSecret`, `accessToken` e `refreshToken` são
  **cifrados em repouso** com **AES-256-GCM** (`crypto.js`), no formato `enc:v1:<iv>:<tag>:<dados>`.
  A chave deriva de `ENCRYPTION_KEY` (variável de ambiente). Mesmo que o arquivo `dev.db` vaze,
  esses segredos permanecem ilegíveis sem a chave. O *secret* nunca é devolvido à interface.
- **Sessão:** *cookie* assinado com `SESSION_SECRET`; guarda apenas o `userId`.
- **Versionamento:** `.env` (segredos) e `dev.db` (banco) estão no `.gitignore` — nada sensível é
  publicado no repositório.

> **Importante:** `ENCRYPTION_KEY` e `SESSION_SECRET` devem permanecer **estáveis**. Alterar a
> chave de criptografia torna os dados cifrados irrecuperáveis (seria necessário reautorizar o ML).

---

## 12. Landing page

A pasta `marketplace helper LP/` contém uma **página comercial estática** (HTML/CSS), servida por
um servidor Node **sem dependências** na porta **8080** (`INICIAR-LP.BAT`). Apresenta a solução,
seus recursos, um comparativo "antes × depois", FAQ e um **botão flutuante de WhatsApp**
(número configurável em `config.js`). Os botões *Entrar* e *Crie sua conta* apontam para o
aplicativo (`window.APP_URL`, por padrão `http://localhost:3333`). Por ser estática, pode ser
hospedada em qualquer serviço (Vercel, Netlify, GitHub Pages, etc.) sem o Node.

---

## 13. Mapa de rotas

**Públicas:** `GET/POST /login` · `GET/POST /register` · `GET/POST /recuperar-senha` · `GET/POST /logout`

**Protegidas (exigem login):**

| Método | Rota | Função |
|---|---|---|
| GET | `/` | **Painel de KPIs e insights (página principal)** |
| GET | `/dashboard` | Painel de KPIs e insights (alias de `/`) |
| GET | `/anuncios` | Lista de anúncios (busca, ordenação, `?filter=`) |
| GET | `/produtos` | Produtos agrupados por SKU |
| POST | `/produtos/custo` | Define custo de um SKU (aplica a todos os anúncios) |
| GET | `/frete` | Calculadora de frete (cubagem + tabela do ML) |
| GET/POST | `/regras` | Regras de negócio (impostos/custos) |
| GET/POST | `/simulador` | Simulador de anúncio |
| GET | `/auth` · POST `/auth/credentials` · POST `/auth/code` | Autorização Mercado Livre |
| GET | `/callback` | Callback OAuth (fallback) |
| POST | `/sync` · POST `/sync/selection` · GET `/sync/status` | Sincronização e progresso |
| POST | `/settings/zip` | CEP de cálculo de frete |
| GET | `/export` | Exporta Excel |
| GET | `/conta` · POST `/conta/perfil` · POST `/conta/senha` | Minha conta |

---

## 14. Variáveis de ambiente

Arquivo `.env` (modelo em `.env.example`):

| Variável | Descrição |
|---|---|
| `PORT` | Porta do aplicativo (padrão **3333**) |
| `SESSION_SECRET` | Segredo de assinatura do *cookie* de sessão (aleatório, estável) |
| `ENCRYPTION_KEY` | Chave (64 hex) para cifrar segredos do ML no banco (estável) |
| `DATABASE_URL` | Caminho do SQLite — `file:./dev.db` |

As credenciais do Mercado Livre **não** ficam no `.env`: são cadastradas por usuário na tela
*Autorização*.

---

## 15. Passo a passo: executar em uma nova máquina

### Pré-requisitos

- **Node.js 18 ou superior** (desenvolvido em Node 24). Baixe em <https://nodejs.org>.
- **Git** (para clonar) — opcional se você copiar a pasta manualmente.
- Uma **conta de desenvolvedor no Mercado Livre** com um **aplicativo** criado
  (<https://developers.mercadolivre.com.br>), do qual você obterá **App ID**, **Secret Key** e
  cadastrará uma **Redirect URI**.

### 15.1. Obter o código

```bash
git clone https://github.com/bebaby-processosdigitais/marketplace-helper.git
cd marketplace-helper
```

### 15.2. Instalar as dependências

```bash
npm install
```

### 15.3. Criar o arquivo `.env`

Copie o modelo e gere os segredos:

```bash
cp .env.example .env
```

Gere valores aleatórios para `SESSION_SECRET` e `ENCRYPTION_KEY`:

```bash
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Edite o `.env` deixando-o assim (substituindo pelos valores gerados):

```
PORT=3333
SESSION_SECRET=<valor_gerado>
ENCRYPTION_KEY=<valor_gerado>
DATABASE_URL="file:./dev.db"
```

> Guarde esses valores com segurança. Se perder `ENCRYPTION_KEY` depois de autorizar o ML,
> será preciso reautorizar.

### 15.4. Preparar o banco de dados

```bash
npx prisma migrate deploy
npx prisma generate
```

Isso cria o `dev.db` (vazio) e o cliente do Prisma.

### 15.5. Iniciar a aplicação

```bash
npm start
```

Acesse **<http://localhost:3333>**.

> **No Windows**, em vez dos passos 15.2 a 15.5, basta um duplo clique em **`INICIAR.BAT`**:
> ele instala dependências (na primeira vez), prepara o banco, libera a porta 3333 e abre o Chrome.

### 15.6. Primeiro uso (dentro do aplicativo)

1. **Crie sua conta** (nome da loja, e-mail, WhatsApp, senha).
2. Em **Autorização**, informe **App ID**, **Secret Key** e **Redirect URI** do seu app no Mercado
   Livre e salve.
3. Clique em **Autorizar no Mercado Livre**, faça login, autorize e **cole** a URL (ou o `code`)
   de retorno.
4. Em **Anúncios**, clique em **Atualizar tudo** para importar o catálogo.
5. Em **Produtos**, preencha os **custos** por SKU; em **Regras**, informe as **alíquotas**.
6. Consulte o **Dashboard** para ver lucro, margem e *insights*.

### 15.7. (Opcional) Landing page

```bash
cd "marketplace helper LP"
npm start        # ou duplo clique em INICIAR-LP.BAT (Windows)
```

Acesse **<http://localhost:8080>**.

---

## 16. Scripts disponíveis

| Comando | Ação |
|---|---|
| `npm start` | Inicia o servidor (`node src/server.js`) |
| `npm run dev` | Inicia com *watch* (reinício automático ao salvar) |
| `npm run prisma:migrate` | Cria/aplica migrações em desenvolvimento |
| `npm run prisma:generate` | Regenera o Prisma Client |
| `npm run prisma:studio` | Abre o Prisma Studio (inspeção visual do banco) |

---

## 17. Solução de problemas

- **Porta 3333 ocupada / "EADDRINUSE":** há um servidor antigo em execução. O `INICIAR.BAT` já
  libera a porta automaticamente; manualmente, encerre o processo Node correspondente.
- **A tela mostra código antigo após uma atualização:** o processo em memória precisa reiniciar.
  Feche a janela do servidor e rode o `INICIAR.BAT` novamente.
- **Erro de autorização no Mercado Livre:** confira se a **Redirect URI** no painel do ML é
  **idêntica** à cadastrada no app.
- **Campos do Prisma "unknown" / coluna inexistente:** rode `npx prisma migrate deploy` e
  `npx prisma generate` (o `INICIAR.BAT` faz isso a cada início).
- **Imagens/permalinks ausentes nos anúncios antigos:** execute um **Atualizar tudo** — esses
  campos passam a ser capturados na sincronização.

---

## 18. Limitações conhecidas e trabalhos futuros

- **Recuperação de senha por e-mail:** interface pronta; falta integrar um provedor de e-mail.
- **Status de vencedor no catálogo:** o KPI "No catálogo" conta anúncios **no** catálogo; distinguir
  quem está **ganhando** o *buy box* exigiria uma chamada `price_to_win` por item na sincronização.
- **Usuários convidados (equipe):** planejado — permitir que a conta dona conceda acesso de
  leitura a usuários adicionais compartilhando os mesmos dados.
- **Agendamento sempre ativo:** o cron depende do servidor em execução; em produção, recomenda-se
  um ambiente sempre ligado.
- **Produção:** para uso hospedado, recomenda-se migrar para PostgreSQL, com acesso restrito,
  criptografia de disco e os segredos em variáveis de ambiente do servidor.

---

## 19. Licença

Uso interno / proprietário.
