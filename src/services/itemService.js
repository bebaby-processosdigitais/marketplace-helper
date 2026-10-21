import prisma from "../config/prisma.js";

export const PAGE_SIZE = 50;

// Colunas permitidas para ordenacao (chave da UI -> campo no banco)
export const SORTABLE = {
  mlb: "mlb",
  titulo: "titulo",
  sku: "sku",
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

// Filtro: sempre escopado ao usuario + busca opcional por MLB/titulo/SKU
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

  const field = SORTABLE[sort];
  const direction = dir === "asc" ? "asc" : "desc";
  const orderBy = field ? { [field]: direction } : { updatedAt: "desc" };

  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    items,
    total,
    page: currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    search,
    sort: field ? sort : "",
    dir: direction,
  };
}
