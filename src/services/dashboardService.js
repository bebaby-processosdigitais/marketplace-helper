import prisma from "../config/prisma.js";
import { getBusinessRules } from "./rulesService.js";
import { computeProfit, computeHealth } from "./calcService.js";

// Dados do dashboard, escopados ao usuario
export async function getDashboardData(userId) {
  const rules = await getBusinessRules(userId);

  // Últimos 5 anúncios cadastrados (com cálculo e saúde)
  const ultimosRaw = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const ultimosAnuncios = ultimosRaw.map((it) => {
    const calc = computeProfit(it, rules);
    return { ...it, _calc: calc, _health: computeHealth(it, calc) };
  });

  const total = await prisma.item.count({ where: { userId } });
  const comFrete = await prisma.item.count({ where: { userId, frete: { not: null } } });

  const fretesMaisCaros = await prisma.item.findMany({
    where: { userId, frete: { not: null } },
    orderBy: { frete: "desc" },
    take: 10,
    select: { mlb: true, titulo: true, frete: true, precoDe: true, precoPor: true },
  });

  const fretesMudaram = await prisma.item.findMany({
    where: { userId, freteMudou: true },
    orderBy: { frete: "desc" },
    select: { mlb: true, titulo: true, frete: true, freteAnterior: true },
  });

  const agg = await prisma.item.aggregate({
    where: { userId, frete: { not: null } },
    _avg: { frete: true },
    _max: { frete: true },
    _min: { frete: true },
    _sum: { frete: true },
  });

  const totals = await prisma.item.aggregate({
    where: { userId },
    _sum: { estoque: true, vendas: true, visitas: true },
  });

  const porTipoRaw = await prisma.item.groupBy({
    by: ["tipoAnuncio"],
    where: { userId },
    _count: { _all: true },
  });
  const porTipo = porTipoRaw.map((r) => ({
    tipo: r.tipoAnuncio || "N/A",
    count: r._count._all,
  }));

  const full = await prisma.item.count({ where: { userId, full: true } });
  const catalogo = await prisma.item.count({ where: { userId, catalogo: true } });

  let deltaTotal = 0;
  for (const f of fretesMudaram) {
    if (f.frete != null && f.freteAnterior != null) deltaTotal += f.frete - f.freteAnterior;
  }

  // ===== Passada única para KPIs de rentabilidade/saúde e insights =====
  const allItems = await prisma.item.findMany({ where: { userId } });

  let somaMargem = 0, countMargem = 0;
  let prejuizo = 0, margemBaixa = 0;
  let saudaveis = 0, comCusto = 0;
  let somaTicket = 0, countTicket = 0;
  let semEstoqueAtivos = 0, semCustoAtivos = 0, semVendasAtivos = 0, freteSubiu = 0;

  for (const it of allItems) {
    const calc = computeProfit(it, rules);
    const health = computeHealth(it, calc);
    if (health.label === "Saudável") saudaveis++;
    if (it.custoProduto != null) comCusto++;

    if (it.freteMudou && it.frete != null && it.freteAnterior != null && it.frete > it.freteAnterior) {
      freteSubiu++;
    }

    if (it.status === "active") {
      if ((it.estoque || 0) <= 0) semEstoqueAtivos++;
      if (it.custoProduto == null) semCustoAtivos++;
      if ((it.vendas || 0) === 0) semVendasAtivos++;
      if (calc.base > 0) { somaTicket += calc.base; countTicket++; }
      if (it.custoProduto != null && calc.margem != null) {
        somaMargem += calc.margem;
        countMargem++;
        if (calc.margem < 0) prejuizo++;
        else if (calc.margem < 10) margemBaixa++;
      }
    }
  }

  const margemMedia = countMargem ? somaMargem / countMargem : null;
  const ticketMedio = countTicket ? somaTicket / countTicket : 0;
  const pctSaudaveis = allItems.length ? (saudaveis / allItems.length) * 100 : 0;
  const coberturaCusto = allItems.length ? (comCusto / allItems.length) * 100 : 0;

  // ===== Insights inteligentes (só mostra o que tiver ocorrência) =====
  const insights = [];
  if (semEstoqueAtivos > 0)
    insights.push({ color: "danger", icon: "box-seam", titulo: `${semEstoqueAtivos} anúncio(s) ativos sem estoque`, texto: "Reabasteça para não perder posição no ranking do Mercado Livre.", link: "/?sort=estoque&dir=asc" });
  if (prejuizo > 0)
    insights.push({ color: "danger", icon: "graph-down-arrow", titulo: `${prejuizo} anúncio(s) no prejuízo`, texto: "Margem negativa — revise preço, custo do produto ou frete.", link: "/?sort=margem&dir=asc" });
  if (margemBaixa > 0)
    insights.push({ color: "warning", icon: "exclamation-triangle", titulo: `${margemBaixa} anúncio(s) com margem baixa`, texto: "Margem abaixo de 10%. Considere reajustar o preço.", link: "/?sort=margem&dir=asc" });
  if (semCustoAtivos > 0)
    insights.push({ color: "secondary", icon: "tag", titulo: `${semCustoAtivos} anúncio(s) ativos sem custo preenchido`, texto: "Preencha o custo na coluna 'Custo' para calcular a margem real.", link: "/?sort=custoProduto&dir=asc" });
  if (semVendasAtivos > 0)
    insights.push({ color: "secondary", icon: "cart-x", titulo: `${semVendasAtivos} anúncio(s) ativos sem nenhuma venda`, texto: "Revise título, fotos e preço para destravar as vendas.", link: "/?sort=vendas&dir=asc" });
  if (freteSubiu > 0)
    insights.push({ color: "warning", icon: "truck", titulo: `Frete subiu em ${freteSubiu} anúncio(s)`, texto: "O custo de frete aumentou no último sync — reveja a margem desses itens.", link: "/?sort=frete&dir=desc" });

  return {
    ultimosAnuncios,
    insights,
    margemMedia,
    ticketMedio,
    pctSaudaveis,
    coberturaCusto,
    prejuizo,
    semEstoqueAtivos,
    total,
    comFrete,
    full,
    catalogo,
    fretesMaisCaros,
    fretesMudaram,
    deltaTotal,
    freteMedio: agg._avg.frete || 0,
    freteMax: agg._max.frete || 0,
    freteMin: agg._min.frete || 0,
    freteSoma: agg._sum.frete || 0,
    estoqueTotal: totals._sum.estoque || 0,
    vendasTotal: totals._sum.vendas || 0,
    visitasTotal: totals._sum.visitas || 0,
    porTipo,
  };
}
