import prisma from "../config/prisma.js";

// Dados do dashboard, escopados ao usuario
export async function getDashboardData(userId) {
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

  let deltaTotal = 0;
  for (const f of fretesMudaram) {
    if (f.frete != null && f.freteAnterior != null) deltaTotal += f.frete - f.freteAnterior;
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
