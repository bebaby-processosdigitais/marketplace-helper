import prisma from "../config/prisma.js";
import { getBusinessRules } from "./rulesService.js";
import { computeProfit, computeHealth } from "./calcService.js";
import { classificarTamanhoFull } from "./freteTable.js";

const LIMIAR = 8; // mesmo limiar de desempenho (margem %) usado no dashboard

// Ordem e cores dos tamanhos no Full (armazenagem é cobrada por tamanho).
const TAM_ORDEM = ["Pequeno", "Médio", "Grande", "Extragrande", "Fora do Full", "Sem medidas"];
const TAM_COR = {
  Pequeno: "success",
  "Médio": "primary",
  Grande: "warning",
  Extragrande: "secondary",
  "Fora do Full": "danger",
  "Sem medidas": "light",
};

// Reúne métricas, distribuição por tamanho, insights e listas dos anúncios no Full.
export async function getFullData(userId) {
  const rules = await getBusinessRules(userId);

  const totalGeral = await prisma.item.count({ where: { userId } });
  const items = await prisma.item.findMany({ where: { userId, full: true } });

  const totalFull = items.length;
  let ativos = 0, inativos = 0, catalogo = 0;
  let semEstoque = 0, estoqueBaixo = 0, parados = 0, foraLimites = 0, prejuizo = 0, semMedidas = 0;
  let estoqueTotal = 0, vendasTotal = 0, visitasTotal = 0;
  let somaTicket = 0, countTicket = 0;
  let somaMargem = 0, countMargem = 0, somaLucro = 0;

  const tamanhos = Object.fromEntries(TAM_ORDEM.map((t) => [t, 0]));

  const estoqueBaixoList = [];
  const paradosList = [];
  const foraList = [];
  const topVendas = [];

  for (const it of items) {
    const calc = computeProfit(it, rules);
    const health = computeHealth(it, calc);
    const tam = classificarTamanhoFull(it.largura, it.altura, it.comprimento, it.pesoReal);
    const tamNome = tam ? tam.tamanho : "Sem medidas";
    tamanhos[tamNome] = (tamanhos[tamNome] || 0) + 1;
    if (!tam) semMedidas++;
    if (tam && tam.dentroDoFull === false) {
      foraLimites++;
      foraList.push({ ...it, _tam: tam });
    }

    estoqueTotal += it.estoque || 0;
    vendasTotal += it.vendas || 0;
    visitasTotal += it.visitas || 0;
    if (it.catalogo) catalogo++;

    const ativo = it.status === "active";
    if (ativo) {
      ativos++;
      const est = it.estoque || 0;
      if (est <= 0) {
        semEstoque++;
        estoqueBaixoList.push({ ...it, _calc: calc, _health: health });
      } else if (est <= 5) {
        estoqueBaixo++;
        estoqueBaixoList.push({ ...it, _calc: calc, _health: health });
      }
      if (est > 0 && (it.vendas || 0) === 0) {
        parados++;
        paradosList.push({ ...it, _calc: calc });
      }
      if (calc.base > 0) { somaTicket += calc.base; countTicket++; }
      if (it.custoProduto != null && calc.margem != null) {
        somaMargem += calc.margem;
        countMargem++;
        somaLucro += calc.lucro || 0;
        if (calc.margem < 0) prejuizo++;
      }
    } else {
      inativos++;
    }

    if ((it.vendas || 0) > 0) topVendas.push({ ...it, _calc: calc });
  }

  // Ordenações das listas (limitadas a 10)
  estoqueBaixoList.sort((a, b) => (a.estoque || 0) - (b.estoque || 0));
  paradosList.sort((a, b) => (b.estoque || 0) - (a.estoque || 0)); // mais estoque parado primeiro
  topVendas.sort((a, b) => (b.vendas || 0) - (a.vendas || 0));
  foraList.sort((a, b) => (b._tam.maiorLado || 0) - (a._tam.maiorLado || 0));

  const ticketMedio = countTicket ? somaTicket / countTicket : 0;
  const margemMedia = countMargem ? somaMargem / countMargem : null;
  const lucroMedio = countMargem ? somaLucro / countMargem : null;
  const penetracao = totalGeral ? (totalFull / totalGeral) * 100 : 0;

  // Distribuição por tamanho (só os que têm ocorrência), já com cor e %.
  const distTamanho = TAM_ORDEM
    .filter((t) => tamanhos[t] > 0)
    .map((t) => ({
      nome: t,
      count: tamanhos[t],
      cor: TAM_COR[t],
      pct: totalFull ? (tamanhos[t] / totalFull) * 100 : 0,
    }));

  // Insights (só mostra o que tiver ocorrência).
  const insights = [];
  if (semEstoque > 0)
    insights.push({ color: "danger", icon: "x-octagon", titulo: `${semEstoque} anúncio(s) no Full em ruptura (sem estoque)`, texto: "Sem estoque no Full você perde a Buy Box e cai no ranking. Reabasteça com urgência.", link: "/anuncios?filter=full_sem_estoque" });
  if (estoqueBaixo > 0)
    insights.push({ color: "warning", icon: "box-seam", titulo: `${estoqueBaixo} anúncio(s) no Full com estoque baixo`, texto: "Até 5 unidades. Programe o reabastecimento considerando o prazo de entrada no Full.", link: "/anuncios?filter=full_estoque_baixo" });
  if (parados > 0)
    insights.push({ color: "warning", icon: "hourglass-split", titulo: `${parados} anúncio(s) parado(s) no Full (sem vendas)`, texto: "Estoque sem giro paga armazenagem. Revise preço/anúncio ou considere retirar do Full.", link: "/anuncios?filter=full_parado" });
  if (foraLimites > 0)
    insights.push({ color: "danger", icon: "arrows-angle-expand", titulo: `${foraLimites} anúncio(s) fora dos limites de tamanho do Full`, texto: "Pelas medidas cadastradas excedem peso 25 kg, lado 120 cm ou soma 260 cm. Confira as dimensões no ML.", link: "/anuncios?filter=full_fora" });
  if (prejuizo > 0)
    insights.push({ color: "danger", icon: "graph-down-arrow", titulo: `${prejuizo} anúncio(s) no Full no prejuízo`, texto: "Margem negativa — some a tarifa de armazenagem do Full ao custo e revise o preço.", link: "/anuncios?filter=prejuizo" });
  if (semMedidas > 0)
    insights.push({ color: "secondary", icon: "rulers", titulo: `${semMedidas} anúncio(s) no Full sem medidas`, texto: "Sem L×A×C e peso não dá para classificar o tamanho nem estimar a armazenagem.", link: "/produtos" });

  return {
    totalGeral, totalFull, penetracao,
    ativos, inativos, catalogo,
    semEstoque, estoqueBaixo, parados, foraLimites, prejuizo, semMedidas,
    estoqueTotal, vendasTotal, visitasTotal,
    ticketMedio, margemMedia, lucroMedio, countMargem,
    distTamanho,
    insights,
    estoqueBaixoList: estoqueBaixoList.slice(0, 10),
    paradosList: paradosList.slice(0, 10),
    topVendas: topVendas.slice(0, 10),
    foraList: foraList.slice(0, 10),
  };
}
