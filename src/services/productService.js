import prisma from "../config/prisma.js";
import { avaliaDivergencia } from "./freteTable.js";

export const PAGE_SIZE = 50;

const basePreco = (it) => (it.precoPor && it.precoPor > 0 ? it.precoPor : it.precoDe || 0);

// Agrupa os anúncios por SKU, formando "produtos".
export async function listProducts({ userId, page = 1, search = "" } = {}) {
  const items = await prisma.item.findMany({
    where: { userId, sku: { not: null } },
    select: {
      sku: true, titulo: true, mlb: true, custoProduto: true, thumbnail: true,
      largura: true, altura: true, comprimento: true, pesoReal: true,
      precoDe: true, precoPor: true, frete: true, status: true,
    },
  });

  const map = new Map();
  for (const it of items) {
    const sku = (it.sku || "").trim();
    if (!sku) continue;
    if (!map.has(sku)) {
      map.set(sku, {
        sku, nomes: {}, mlbs: [], custos: new Set(), custo: null, thumbnail: null,
        largura: null, altura: null, comprimento: null, pesoReal: null, itens: [],
      });
    }
    const g = map.get(sku);
    g.mlbs.push(it.mlb);
    g.itens.push(it);
    g.nomes[it.titulo] = (g.nomes[it.titulo] || 0) + 1;
    if (it.custoProduto != null) {
      g.custos.add(it.custoProduto);
      if (g.custo == null) g.custo = it.custoProduto;
    }
    // Medidas: usa o primeiro valor preenchido encontrado no SKU.
    for (const campo of ["largura", "altura", "comprimento", "pesoReal"]) {
      if (g[campo] == null && it[campo] != null) g[campo] = it[campo];
    }
    if (!g.thumbnail && it.thumbnail) g.thumbnail = it.thumbnail;
  }

  let products = [...map.values()].map((g) => {
    const dims = { largura: g.largura, altura: g.altura, comprimento: g.comprimento, pesoReal: g.pesoReal };

    // Anúncio representativo: o de maior preço com frete cobrado disponível.
    const comFrete = g.itens.filter((it) => it.frete != null);
    const rep = (comFrete.length ? comFrete : g.itens)
      .slice()
      .sort((a, b) => basePreco(b) - basePreco(a))[0];

    const div = rep ? avaliaDivergencia({ ...rep, ...dims }) : null;

    // Quantos anúncios do SKU estão divergentes (cada um com seu preço).
    let nDivergentes = 0;
    for (const it of g.itens) {
      if (avaliaDivergencia({ ...it, ...dims }).divergente) nDivergentes++;
    }

    return {
      sku: g.sku,
      nome: Object.entries(g.nomes).sort((a, b) => b[1] - a[1])[0]?.[0] || "",
      qtd: g.mlbs.length,
      mlbs: g.mlbs,
      custo: g.custo,
      custoMisto: g.custos.size > 1,
      thumbnail: g.thumbnail,
      ...dims,
      temMedidas: div ? div.temMedidas : false,
      cubagem: div && div.cubagem != null ? div.cubagem : null,
      freteCobrado: div ? div.freteCobrado : null,
      freteReal: div ? div.freteReal : null,
      delta: div ? div.delta : null,
      divergente: div ? div.divergente : false,
      nDivergentes,
    };
  });

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

// Converte entrada numérica (positiva) ou retorna null.
function posOrNull(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Aplica as medidas (L/A/C/peso) a TODOS os anúncios de um SKU e devolve a
// comparação frete cobrado × real do anúncio representativo.
export async function setDimsForSku(userId, sku, dims) {
  const data = {
    largura: posOrNull(dims.largura),
    altura: posOrNull(dims.altura),
    comprimento: posOrNull(dims.comprimento),
    pesoReal: posOrNull(dims.pesoReal),
  };
  const r = await prisma.item.updateMany({ where: { userId, sku }, data });

  // Recalcula a divergência do representativo após salvar.
  const itens = await prisma.item.findMany({
    where: { userId, sku },
    select: { precoDe: true, precoPor: true, frete: true, largura: true, altura: true, comprimento: true, pesoReal: true },
  });
  const comFrete = itens.filter((it) => it.frete != null);
  const rep = (comFrete.length ? comFrete : itens).slice().sort((a, b) => basePreco(b) - basePreco(a))[0];
  const div = rep ? avaliaDivergencia(rep) : null;

  return { ...data, afetados: r.count, comparacao: div };
}
