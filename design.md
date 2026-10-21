# Design System — Marketplace Helper

Guia de design da aplicação. Estilo **minimalista**, inspirado em
[mktpfacil.com](https://www.mktpfacil.com/): fundo claro, azul-marinho como
cor principal, muito espaço em branco, tipografia forte e cantos arredondados.

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
| `--mh-surface` | `#ffffff` | Cards, navbar, tabela, modais |
| `--mh-text` | `#0f1729` | Texto principal e títulos |
| `--mh-muted` | `#65758b` | Texto secundário, labels, ícones |
| `--mh-border` | `#e1e7ef` | Bordas, divisórias, linhas de tabela |
| `--mh-primary` | `#1f2f56` | Ação principal, logo, números de destaque |
| `--mh-primary-hover` | `#182540` | Hover da primária |
| `--mh-primary-soft` | `#eef1f6` | Fundo de pílulas/badges neutros, hover de linha |
| `--mh-success` | `#15803d` | Positivo (frete caiu, sucesso) |
| `--mh-danger` | `#dc2626` | Negativo (frete subiu, erro), "Custo ML" |

Regra: **não** usar amarelo/azul fortes do Mercado Livre. A identidade agora é o navy.

## Tipografia

- **Fonte:** `Inter` (Google Fonts), fallback `system-ui, sans-serif`.
- **Títulos (h1–h5):** peso **700**, cor `--mh-text`, `letter-spacing: -0.01em`.
- **Corpo:** 15–16px, peso 400, cor `--mh-text`; apoio em `--mh-muted`.
- **Labels de KPI / cabeçalho de tabela:** 11–12px, maiúsculas, `letter-spacing: .04em`, cor `--mh-muted`.

## Forma e profundidade

- **Raio:** `--mh-radius: 12px` (cards, tabela, modais) · `--mh-radius-sm: 10px` (botões, inputs, badges).
- **Sombra (card):** `0 1px 3px rgba(15,23,41,.06), 0 1px 2px rgba(15,23,41,.04)`. Sutil, sempre.
- **Bordas:** 1px `--mh-border`. Preferir borda a sombra forte.

## Componentes

### Navbar
- Fundo **branco**, borda inferior fina (`--mh-border`), sem sombra pesada, sticky.
- Logo à esquerda: ícone simples + "Marketplace Helper" em `--mh-text`, peso 700.
- Links em `--mh-muted`; ativo em `--mh-primary` (peso 600). Sem fundo colorido.
- Badge de status (Conectado / Não autorizado) como pílula suave.

### Botões
- **Primário:** fundo `--mh-primary`, texto branco, raio `sm`, peso 600, sem sombra. Hover `--mh-primary-hover`.
- **Secundário/Outline:** fundo transparente, borda `--mh-border`, texto `--mh-text`. Hover: fundo `--mh-primary-soft`.
- Altura confortável (padding ~8px 16px). Ícone + texto com gap pequeno.
- Evitar muitos botões sólidos lado a lado: **só a ação principal é sólida**, o resto é outline/ghost.

### Cards / KPI
- Superfície branca, raio 12px, sombra de card, padding generoso.
- Label pequena em maiúsculas (`--mh-muted`) + valor grande (peso 700, `--mh-primary`).

### Tabela
- Cabeçalho **claro** (fundo `--mh-surface` ou `--mh-primary-soft`), texto pequeno maiúsculo `--mh-muted` — **nunca** cabeçalho escuro.
- Linhas com divisória fina `--mh-border`; hover em `--mh-primary-soft`.
- Bastante respiro vertical nas células. Números alinhados à direita.
- Cabeçalhos ordenáveis: texto `--mh-muted`, seta ativa em `--mh-primary`.

### Badges / pílulas
- Formato pílula, cores suaves (fundo claro + texto da cor). Status ativo = verde suave; pausado/neutro = cinza.
- Variação de frete: ↑ `--mh-danger`, ↓ `--mh-success`.

### Inputs
- Borda `--mh-border`, raio `sm`, foco com anel navy discreto. Fundo branco.

## O que evitar
- Cabeçalho de tabela escuro, gradientes, sombras pesadas, muitas cores.
- Mais de uma cor de destaque por tela.
- Emojis como ícone de status onde um badge/ícone de linha fica mais limpo.
