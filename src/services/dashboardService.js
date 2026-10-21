import prisma from "../config/prisma.js";

// Reune os dados inteligentes do dashboard
export async function getDashboardData() {
  const total = await prisma.item.count();
  const comFrete = await prisma.item.count({ where: { frete: { not: null } } });

  // Fretes mais caros (top 10)
  const fretesMaisCaros = await prisma.item.findMany({
    where: { frete: { not: null } },
    orderBy: { frete: "desc" },
    take: 10,
    select: { mlb: true, titulo: true, frete: true, precoDe: true, precoPor: true },
  });

  // Fretes que mudaram no ultimo sync
  const fretesMudaram = await prisma.item.findMany({
    where: { freteMudou: true },
    orderBy: { frete: "desc" },
    select: {
      mlb: true,
      titulo: true,
      frete: true,
      freteAnterior: true,
    },
  });

  // Agregados
  const agg = await prisma.item.aggregate({
    where: { frete: { not: null } },
    _avg: { frete: true },
    _max: { frete: true },
    _min: { frete: true },
    _sum: { frete: true },
  });

  // Total de estoque e vendas
  const totals = await prisma.item.aggregate({
    _sum: { estoque: true, vendas: true, visitas: true },
  });

  // Distribuicao por tipo de anuncio
  const porTipoRaw = await prisma.item.groupBy({
    by: ["tipoAnuncio"],
    _count: { _all: true },
  });
  const porTipo = porTipoRaw.map((r) => ({
    tipo: r.tipoAnuncio || "N/A",
    count: r._count._all,
  }));

  // Contagem de FULL
  const full = await prisma.item.count({ where: { full: true } });

  // Variacao total de frete (economia/aumento) entre os que mudaram
  let deltaTotal = 0;
  for (const f of fretesMudaram) {
    if (f.frete != null && f.freteAnterior != null) {
      deltaTotal += f.frete - f.freteAnterior;
    }
  }

  return {
    total,
    comFrete,
    full,
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
