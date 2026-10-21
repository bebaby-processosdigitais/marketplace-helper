import prisma from "../config/prisma.js";

export const PAGE_SIZE = 50;

// Monta o filtro de busca por MLB ou titulo (SQLite: contains sem mode)
export function buildItemWhere(search) {
  if (!search || !search.trim()) return {};
  const q = search.trim();
  return {
    OR: [
      { mlb: { contains: q } },
      { titulo: { contains: q } },
      { sku: { contains: q } },
    ],
  };
}

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

// Lista paginada de itens (com busca e ordenacao por coluna)
export async function listItems({ page = 1, search = "", sort = "", dir = "" } = {}) {
  const where = buildItemWhere(search);
  const currentPage = Math.max(1, Number(page) || 1);

  // Ordenacao: usa coluna da whitelist; senao, padrao por atualizacao recente
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
