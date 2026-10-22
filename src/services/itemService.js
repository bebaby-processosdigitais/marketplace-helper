import prisma from "../config/prisma.js";
import { getBusinessRules } from "./rulesService.js";
import { computeProfit } from "./calcService.js";

export const PAGE_SIZE = 50;

// Colunas ordenáveis direto no banco (chave da UI -> campo no banco)
export const SORTABLE = {
  mlb: "mlb",
  titulo: "titulo",
  sku: "sku",
  custoProduto: "custoProduto",
  precoDe: "precoDe",
  precoPor: "precoPor",
  frete: "frete",
  comissao: "comissao",
  tipo: "tipoAnuncio",
  visitas: "visitas",
  vendas: "vendas",
  estoque: "estoque",
  full: "full",
  status: "status",
};

// Colunas ordenáveis que são calculadas em memória
export const COMPUTED_SORT = {
  custoML: "custoML",
  lucro: "lucro",
  margem: "margem",
};

export function buildItemWhere(userId, search) {
  const where = { userId };
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { mlb: { contains: q } },
      { titulo: { contains: q } },
      { sku: { contains: q } },
    ];
  }
  return where;
}

export async function listItems({ userId, page = 1, search = "", sort = "", dir = "" } = {}) {
  const where = buildItemWhere(userId, search);
  const currentPage = Math.max(1, Number(page) || 1);
  const direction = dir === "asc" ? "asc" : "desc";
  const rules = await getBusinessRules(userId);

  const dbField = SORTABLE[sort];
  const computedField = COMPUTED_SORT[sort];

  const total = await prisma.item.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  let items;
  if (computedField) {
    // Ordena por valor calculado: carrega todos, calcula, ordena e pagina
    const all = await prisma.item.findMany({ where });
    const withCalc = all.map((it) => ({ ...it, _calc: computeProfit(it, rules) }));
    withCalc.sort((a, b) => {
      const av = a._calc[computedField];
      const bv = b._calc[computedField];
      const an = av == null ? -Infinity : av;
      const bn = bv == null ? -Infinity : bv;
      return direction === "asc" ? an - bn : bn - an;
    });
    items = withCalc.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  } else {
    const orderBy = dbField ? { [dbField]: direction } : { updatedAt: "desc" };
    const rows = await prisma.item.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    items = rows.map((it) => ({ ...it, _calc: computeProfit(it, rules) }));
  }

  return {
    items,
    total,
    page: currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    search,
    sort: dbField || computedField ? sort : "",
    dir: direction,
  };
}
