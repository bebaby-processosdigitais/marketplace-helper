import prisma from "../config/prisma.js";

export const PAGE_SIZE = 50;

// Agrupa os anúncios por SKU, formando "produtos".
export async function listProducts({ userId, page = 1, search = "" } = {}) {
  const items = await prisma.item.findMany({
    where: { userId, sku: { not: null } },
    select: { sku: true, titulo: true, mlb: true, custoProduto: true, thumbnail: true },
  });

  const map = new Map();
  for (const it of items) {
    const sku = (it.sku || "").trim();
    if (!sku) continue;
    if (!map.has(sku)) {
      map.set(sku, { sku, nomes: {}, mlbs: [], custos: new Set(), custo: null, thumbnail: null });
    }
    const g = map.get(sku);
    g.mlbs.push(it.mlb);
    g.nomes[it.titulo] = (g.nomes[it.titulo] || 0) + 1;
    if (it.custoProduto != null) {
      g.custos.add(it.custoProduto);
      if (g.custo == null) g.custo = it.custoProduto;
    }
    if (!g.thumbnail && it.thumbnail) g.thumbnail = it.thumbnail;
  }

  let products = [...map.values()].map((g) => ({
    sku: g.sku,
    nome: Object.entries(g.nomes).sort((a, b) => b[1] - a[1])[0]?.[0] || "",
    qtd: g.mlbs.length,
    mlbs: g.mlbs,
    custo: g.custo,
    custoMisto: g.custos.size > 1,
    thumbnail: g.thumbnail,
  }));

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    products = products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.nome.toLowerCase().includes(q) ||
        p.mlbs.some((m) => m.toLowerCase().includes(q))
    );
  }

  products.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const total = products.length;
  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = products.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Anúncios sem SKU (não aparecem aqui — editáveis na tela de Anúncios)
  const semSku = await prisma.item.count({
    where: { userId, OR: [{ sku: null }, { sku: "" }] },
  });

  return {
    products: pageItems,
    total,
    page: currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    search,
    semSku,
  };
}

// Aplica o custo a TODOS os anúncios de um SKU.
export async function setCostForSku(userId, sku, custo) {
  const parsed = parseFloat(String(custo ?? "").replace(",", "."));
  const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  const r = await prisma.item.updateMany({
    where: { userId, sku },
    data: { custoProduto: value },
  });
  return { custoProduto: value, afetados: r.count };
}
