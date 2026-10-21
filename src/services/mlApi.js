import { getValidToken } from "./mlAuth.js";

const API = "https://api.mercadolibre.com";

// Cache de categorias por execucao (evita repetir chamadas)
const categoryCache = new Map();

async function authHeaders() {
  const token = await getValidToken();
  return { Authorization: `Bearer ${token}` };
}

// GET com retry simples e tratamento de 429/erros transitorios
async function apiGet(url, { retries = 3, delay = 800 } = {}) {
  const headers = await authHeaders();
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429) {
        // rate limit: espera e tenta de novo
        await sleep(5000);
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        // erro definitivo do cliente (404 not_found, 400 etc.) — repetir nao resolve
        return null;
      }
      if (!res.ok) {
        // erro de servidor (5xx): vale tentar de novo
        await sleep(delay);
        continue;
      }
      return await res.json();
    } catch (e) {
      await sleep(delay);
    }
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retorna o user_id do vendedor autenticado
export async function getUserId() {
  const data = await apiGet(`${API}/users/me`);
  if (!data?.id) throw new Error("Nao foi possivel obter o usuario autenticado.");
  return data.id;
}

// Busca TODOS os MLBs do vendedor usando paginacao por scan (scroll_id)
export async function getAllItemIds(userId, onProgress) {
  const ids = [];
  let scrollId = null;

  do {
    const params = new URLSearchParams({ search_type: "scan", limit: "100" });
    if (scrollId) params.set("scroll_id", scrollId);

    const data = await apiGet(
      `${API}/users/${userId}/items/search?${params.toString()}`
    );
    if (!data) break;

    const results = data.results || [];
    ids.push(...results);
    scrollId = data.scroll_id;

    if (onProgress) onProgress(ids.length, data.paging?.total);

    if (results.length === 0) break;
  } while (scrollId);

  return ids;
}

// Busca detalhes de varios itens de uma vez (multiget, ate 20 por chamada)
export async function getItemsDetails(mlbs) {
  const chunks = chunk(mlbs, 20);
  const items = [];

  for (const group of chunks) {
    const ids = group.join(",");
    const data = await apiGet(
      `${API}/items?ids=${ids}&include_attributes=all`
    );
    if (!data) continue;
    for (const entry of data) {
      if (entry.code === 200 && entry.body) items.push(entry.body);
    }
  }
  return items;
}

// Visitas de varios itens de uma vez
export async function getVisits(mlbs) {
  const result = {};
  const chunks = chunk(mlbs, 50);
  for (const group of chunks) {
    const ids = group.join(",");
    const data = await apiGet(`${API}/visits/items?ids=${ids}`);
    if (data && typeof data === "object") {
      Object.assign(result, data);
    }
  }
  return result;
}

// Custo de frete de um item.
// Tenta o endpoint real; se indisponivel (comum em itens baratos),
// aplica a tabela fixa de contribuicao de frete do ML por faixa de preco.
export async function getShippingCost(mlb, zipCode, price) {
  const url = `${API}/items/${mlb}/shipping_options?zip_code=${zipCode}`;
  const data = await apiGet(url, { retries: 4, delay: 1000 });

  if (data?.options?.length) {
    const opt = data.options[0];
    const cost =
      opt.list_cost ?? opt.cost ?? opt.base_cost ?? fallbackByPrice(price);
    if (cost != null) return Number(cost);
  }

  return fallbackByPrice(price);
}

// Tabela de contribuicao de frete do ML para itens abaixo do frete gratis
function fallbackByPrice(price) {
  const p = Number(price) || 0;
  if (p <= 18.99) return 6.9;
  if (p <= 48.99) return 8.8;
  if (p <= 78.99) return 9.9;
  return null; // acima da faixa, esperamos o endpoint retornar
}

// Busca os precos do item (inclui promocoes ativas).
// O endpoint /items/{mlb}/prices traz o preco "standard" e as promocoes,
// que o campo original_price do item nem sempre reflete.
export async function getItemPrices(mlb) {
  const data = await apiGet(`${API}/items/${mlb}/prices`, { retries: 2 });
  return data?.prices || [];
}

// Comissao (tarifa de venda) do anuncio.
// /sites/MLB/listing_prices retorna sale_fee_amount (R$) e percentage_fee (%).
export async function getListingFee(price, listingTypeId, categoryId) {
  const p = Number(price) || 0;
  if (!p || !listingTypeId) return null;
  const params = new URLSearchParams({
    price: String(p),
    listing_type_id: listingTypeId,
  });
  if (categoryId) params.set("category_id", categoryId);

  const data = await apiGet(
    `${API}/sites/MLB/listing_prices?${params.toString()}`,
    { retries: 3, delay: 800 }
  );
  if (!data || data.sale_fee_amount == null) return null;

  return {
    amount: Number(data.sale_fee_amount),
    pct: data.sale_fee_details?.percentage_fee ?? null,
    fixed: data.sale_fee_details?.fixed_fee ?? null,
  };
}

// Caminho de categoria (com cache)
export async function getCategoryPath(categoryId) {
  if (!categoryId) return [];
  if (categoryCache.has(categoryId)) return categoryCache.get(categoryId);

  const data = await apiGet(`${API}/categories/${categoryId}`);
  const path = data?.path_from_root || [];
  categoryCache.set(categoryId, path);
  return path;
}

// ================= helpers =================
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function mapListingType(type) {
  if (type === "gold_special") return "CLASSICO";
  if (type === "gold_pro") return "PREMIUM";
  if (type === "free") return "Gratis";
  return "Nao identificado";
}

export function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d)) return "N/A";
  return d.toLocaleDateString("pt-BR");
}
