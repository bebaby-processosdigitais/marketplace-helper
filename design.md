# Design System — Marketplace Helper

Guia de design da aplicação. Estilo **minimalista**, inspirado em
[mktpfacil.com](https://www.mktpfacil.com/): fundo claro, azul-marinho como
cor principal, muito espaço em branco, tipografia forte e cantos arredondados.
A estrutura é um **layout de painel** — barra superior fina + menu lateral à esquerda (recolhível).

## Princípios

1. **Minimalista** — pouca cor, muito respiro. A cor só aparece onde comunica algo
   (ação principal, status, variação de frete).
2. **Hierarquia pela tipografia**, não por caixas pesadas. Títulos escuros e fortes;
   texto de apoio em cinza.
3. **Superfícies limpas** — cards e tabelas em branco sobre fundo cinza-claro,
   com bordas finas e sombra sutil (nunca sombra pesada).
4. **Consistência** — todos os raios, cores e espaçamentos saem dos tokens abaixo.

## Tokens de cor

| Token | Valor | Uso |
|---|---|---|
| `--mh-bg` | `#f8fafc` | Fundo da página |
| `--mh-surface` | `#ffffff` | Cards, barra superior, menu lateral, tabela, modais |
| `--mh-text` | `#0f1729` | Texto principal e títulos |
| `--mh-muted` | `#65758b` | Texto secundário, labels, ícones |
| `--mh-border` | `#e1e7ef` | Bordas, divisórias, linhas de tabela |
| `--mh-primary` | `#1f2f56` | Ação principal, logo, números de destaque |
| `--mh-primary-hover` | `#182540` | Hover da primária |
| `--mh-primary-soft` | `#eef1f6` | Fundo de pílulas/badges neutros, hover de linha |
| `--mh-success` | `#15803d` | Positivo (frete caiu, sucesso) |
| `--mh-danger` | `#dc2626` | Negativo (frete subiu, erro), "Custo ML" |

Regra: **não** usar amarelo/azul fortes do Mercado Livre. A identidade agora é o navy.

**Preenchimentos suaves** (fundo de badges e ícones; o texto/ícone usa a cor forte correspondente):

| Significado | Fundo | Texto/ícone |
|---|---|---|
| Sucesso / positivo | `#dcfce7` | `--mh-success` |
| Perigo / negativo | `#fee2e2` | `--mh-danger` |
| Alerta | `#fef3c7` | `#92650e` |
| Neutro | `--mh-primary-soft` | `--mh-muted` ou `--mh-primary` |

## Tipografia

- **Fonte:** `Inter` (Google Fonts), fallback `system-ui, sans-serif`.
- **Títulos (h1–h5):** peso **700**, cor `--mh-text`, `letter-spacing: -0.01em`.
- **Corpo:** 15–16px, peso 400, cor `--mh-text`; apoio em `--mh-muted`.
- **Labels de KPI / cabeçalho de tabela:** 11–12px, maiúsculas, `letter-spacing: .04em`, cor `--mh-muted`.

## Forma e profundidade

- **Raio:** `--mh-radius: 12px` (cards, tabela, modais) · `--mh-radius-sm: 10px` (botões, inputs, badges).
- **Sombra (card):** `0 1px 3px rgba(15,23,41,.06), 0 1px 2px rgba(15,23,41,.04)`. Sutil, sempre.
- **Bordas:** 1px `--mh-border`. Preferir borda a sombra forte.
- **Dimensões de layout:** `--app-tb-h: 56px` (altura da barra superior) · `--app-sb-w: 244px`
  (largura do menu lateral). Transições suaves (0.2s) ao recolher/abrir.

## Componentes

### Layout e navegação (menu lateral)
A aplicação usa um **layout de painel**: barra superior fina fixa + menu lateral à esquerda.

- **Barra superior** (`--app-tb-h`): fundo branco, borda inferior fina, sem sombra pesada. À
  esquerda, o botão **recolher** (ícone de três linhas) e a marca (ícone + "Marketplace Helper",
  peso 700); à direita, o status de conexão, o **chip da conta** e **Sair** — sempre visíveis.
- **Menu lateral** (`--app-sb-w`): fundo branco, borda à direita. Links verticais com **ícone +
  rótulo**; item ativo em `--mh-primary` sobre `--mh-primary-soft` (peso 600); hover em
  `--mh-primary-soft`. Sem fundo colorido fora do estado ativo.
- **Recolher / esconder:** no desktop, o botão esconde o menu e o conteúdo ocupa a largura toda; o
  estado é **lembrado no navegador**. No mobile/tablet, o menu vira **off-canvas** (escondido por
  padrão), abrindo sobre um fundo escuro translúcido; clicar fora fecha.
- **Chip da conta:** pílula com borda fina, ícone de pessoa e o nome da loja (truncado). Status de
  conexão (Conectado / Não autorizado) como pílula suave.
- As telas de **login/cadastro** não usam esse layout — ficam centralizadas, sem menu.

### Botões
- **Primário:** fundo `--mh-primary`, texto branco, raio `sm`, peso 600, sem sombra. Hover `--mh-primary-hover`.
- **Secundário/Outline:** fundo transparente, borda `--mh-border`, texto `--mh-text`. Hover: fundo `--mh-primary-soft`.
- Altura confortável (padding ~8px 16px). Ícone + texto com gap pequeno.
- Evitar muitos botões sólidos lado a lado: **só a ação principal é sólida**, o resto é outline/ghost.

### Cards / KPI
- Superfície branca, raio 12px, sombra de card, padding generoso.
- Label pequena em maiúsculas (`--mh-muted`) + valor grande (peso 700, `--mh-primary`).
- **Badge de ícone:** cada KPI tem um ícone num quadrado arredondado (38px, raio 10px) com
  preenchimento suave da cor do significado — vermelho (negativo/atenção), amarelo (alerta),
  verde (positivo), azul (neutro), cinza (pendência).
- **KPI clicável:** quando leva a uma lista filtrada, o card inteiro é um link — leve elevação no
  hover (sombra + borda navy) e uma seta discreta no canto superior direito.
- **Rótulos de grupo:** blocos de KPIs são precedidos por um título pequeno em maiúsculas
  (`--mh-muted`) com um ícone navy (ex.: *Desempenho*, *Estoque & cadastro*, *Saúde financeira*).
- Valores podem herdar a cor do estado (verde = positivo, vermelho = negativo) sem quebrar a
  regra de "uma cor de destaque": o navy segue sendo o padrão.

### Tabela
- Cabeçalho **claro** (fundo `--mh-surface` ou `--mh-primary-soft`), texto pequeno maiúsculo `--mh-muted` — **nunca** cabeçalho escuro.
- Linhas com divisória fina `--mh-border`; hover em `--mh-primary-soft`.
- Bastante respiro vertical nas células. Números alinhados à direita.
- Cabeçalhos ordenáveis: texto `--mh-muted`, seta ativa em `--mh-primary`.
- **Cabeçalho fixo** ao rolar tabelas longas (fica "grudado" no topo da área rolável).

### Alternador de visualização (planilha / cards)
- Na lista de anúncios (desktop), um grupo de botões alterna entre **planilha** (tabela densa) e
  **cards** (grade responsiva com o mesmo layout do mobile). O botão ativo é **sólido navy**; os
  demais, outline. A escolha é **lembrada no navegador**. No mobile é sempre em cards.

### Tabela de referência (calculadora de frete)
- Tabela densa e rolável; a célula correspondente ao cálculo é **destacada** em navy sólido com
  texto branco (classe `.fc-hit`), para localização imediata.

### Badges / pílulas
- Formato pílula, cores suaves (fundo claro + texto da cor). Status ativo = verde suave;
  pausado/neutro = cinza; alerta = amarelo suave.
- **Full:** badge **verde** com ícone de raio (`⚡ Full`), no mesmo estilo do status "ativo".
- **Chip de filtro ativo:** pílula navy com o ícone de funil, o nome do filtro e um "×" para limpar
  — aparece na lista de anúncios quando aberta a partir de um KPI do dashboard.
- Variação de frete: ↑ `--mh-danger`, ↓ `--mh-success`.

### Inputs
- Borda `--mh-border`, raio `sm`, foco com anel navy discreto. Fundo branco.

## O que evitar
- Cabeçalho de tabela escuro, gradientes, sombras pesadas, muitas cores.
- Mais de uma cor de destaque por tela.
- Emojis como ícone de status onde um badge/ícone de linha fica mais limpo.
