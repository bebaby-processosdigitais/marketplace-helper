import prisma from "../config/prisma.js";
import {
  getUserId,
  getAllItemIds,
  getItemsDetails,
  getVisits,
  getShippingCost,
  getItemPrices,
  getListingFee,
  getCategoryPath,
  mapListingType,
  formatDate,
} from "./mlApi.js";

// Estado de progresso em memoria (para a UI consultar durante o sync)
let syncState = {
  running: false,
  phase: "idle",
  totalIds: 0,
  processed: 0,
  novos: 0,
  atualizados: 0,
  fretesMudaram: 0,
  startedAt: null,
  finishedAt: null,
  error: null,
};

export function getSyncState() {
  return syncState;
}

// Extrai os campos relevantes do JSON do item do ML
function parseAttributes(data) {
  const attrs = data.attributes || [];
  const findAttr = (id) => attrs.find((a) => a.id === id)?.value_name;

  // SKU
  let sku = data.seller_custom_field || findAttr("SELLER_SKU") || null;

  // Marca
  const marca = findAttr("BRAND") || null;

  // Variacoes
  const variacaoIds = new Set();
  const variacaoSkus = new Set();
  for (const v of data.variations || []) {
    if (v.id) variacaoIds.add(String(v.id));
    if (v.seller_custom_field) variacaoSkus.add(v.seller_custom_field);
    for (const a of v.attributes || []) {
      if (a.id === "SELLER_SKU" && a.value_name) variacaoSkus.add(a.value_name);
    }
  }

  return {
    sku,
    marca,
    variacaoIds: [...variacaoIds].join(", ") || null,
    variacaoSkus: [...variacaoSkus].join(", ") || null,
  };
}

// Retorna true se a promocao esta dentro da janela de validade (start/end)
function promoAtiva(p) {
  const now = Date.now();
  const s = p.conditions?.start_time ? Date.parse(p.conditions.start_time) : -Infinity;
  const e = p.conditions?.end_time ? Date.parse(p.conditions.end_time) : Infinity;
  return now >= s && now <= e;
}

// Calcula PRECO DE / PRECO POR usando o endpoint /prices (promocoes).
// Faz fallback para original_price e price do item se /prices nao trouxer nada.
function parsePrices(data, pricesList) {
  const itemPrice = Number(data.price) || 0;
  const list = Array.isArray(pricesList) ? pricesList : [];

  // Preco normal (standard) do item
  const standard = list.find((p) => p.type === "standard");
  const normal = standard ? Number(standard.amount) : itemPrice;

  // Promocoes ativas (qualquer tipo != standard, com valor valido e dentro da janela)
  const promos = list
    .filter((p) => p.type !== "standard" && Number(p.amount) > 0 && promoAtiva(p))
    .sort((a, b) => Number(a.amount) - Number(b.amount));
  const promo = promos[0];

  if (promo && Number(promo.amount) < normal) {
    const por = Number(promo.amount);
    // "De" = preco normal cadastrado (standard), e nao o regular_amount
    // inflado que o ML usa apenas como valor "riscado" na vitrine.
    return { precoDe: normal, precoPor: por, priceNum: por };
  }

  // Fallback: logica antiga via original_price
  const original =
    data.original_price != null ? Number(data.original_price) : null;
  if (original != null && original > itemPrice) {
    return { precoDe: original, precoPor: itemPrice, priceNum: itemPrice };
  }

  return { precoDe: normal, precoPor: 0, priceNum: normal };
}

// Executa o sync em background.
// Se "mlbs" for passado, sincroniza apenas esses anuncios (selecao);
// senao, varre todos os anuncios do vendedor.
export async function runSync(mlbs = null) {
  if (syncState.running) return syncState;

  const selection = Array.isArray(mlbs) && mlbs.length > 0 ? mlbs : null;

  syncState = {
    running: true,
    phase: "iniciando",
    escopo: selection ? "selecao" : "todos",
    totalIds: selection ? selection.length : 0,
    processed: 0,
    novos: 0,
    atualizados: 0,
    fretesMudaram: 0,
    startedAt: new Date(),
    finishedAt: null,
    error: null,
  };

  // roda em background; a UI acompanha via /sync/status
  doSync(selection).catch((e) => {
    console.error("[SYNC] erro:", e);
    syncState.error = e.message;
    syncState.running = false;
    syncState.phase = "erro";
    syncState.finishedAt = new Date();
  });

  return syncState;
}

async function doSync(selection) {
  const settings = await getSettings();
  const zip = settings.zipCode;

  let ids;
  if (selection) {
    // Sincroniza apenas os MLBs selecionados
    ids = selection.map((m) => String(m).trim().toUpperCase());
    syncState.totalIds = ids.length;
  } else {
    syncState.phase = "buscando lista de anuncios";
    const userId = await getUserId();
    ids = await getAllItemIds(userId, (count, total) => {
      syncState.totalIds = total || count;
    });
    syncState.totalIds = ids.length;
  }

  syncState.phase = "buscando detalhes";
  const details = await getItemsDetails(ids);

  syncState.phase = "buscando visitas";
  const visitsMap = await getVisits(ids);

  syncState.phase = "processando";
  for (const data of details) {
    try {
      await upsertItem(data, zip, visitsMap);
    } catch (e) {
      console.warn(`[SYNC] falha no item ${data?.id}: ${e.message}`);
    }
    syncState.processed++;
  }

  syncState.phase = "concluido";
  syncState.running = false;
  syncState.finishedAt = new Date();
}

async function upsertItem(data, zip, visitsMap) {
  const mlb = data.id;
  const { sku, marca, variacaoIds, variacaoSkus } = parseAttributes(data);

  // Busca precos/promocoes no endpoint dedicado (/prices)
  const pricesList = await getItemPrices(mlb);
  const { precoDe, precoPor, priceNum } = parsePrices(data, pricesList);

  // Categoria
  const path = await getCategoryPath(data.category_id);
  const categoria1 = path[0]?.name || null;
  const categoria2 = path[1]?.name || null;
  const categoria3 = path[2]?.name || null;
  const categoria4 = path[3]?.name || null;

  const visitas = Number(visitsMap[mlb]) || 0;

  const existing = await prisma.item.findUnique({ where: { mlb } });

  // Frete. Se a consulta falhar agora (null) mas ja houver um valor salvo,
  // mantem o anterior em vez de apagar (evita "sumir" o frete em syncs grandes).
  const freteConsultado = await getShippingCost(mlb, zip, priceNum);
  const frete = freteConsultado != null ? freteConsultado : existing?.frete ?? null;

  // Comissao (tarifa de venda) sobre o preco efetivo de venda (promo se houver).
  // Se falhar, mantem o valor anterior.
  const fee = await getListingFee(priceNum, data.listing_type_id, data.category_id);
  const comissao = fee ? fee.amount : existing?.comissao ?? null;
  const comissaoPct = fee ? fee.pct : existing?.comissaoPct ?? null;

  // Detecta mudanca de frete (so quando conseguimos um valor novo valido)
  let freteAnterior = existing?.frete ?? null;
  let freteMudou = false;
  if (
    existing &&
    freteConsultado != null &&
    existing.frete != null &&
    freteConsultado !== existing.frete
  ) {
    freteMudou = true;
  }

  const payload = {
    proprio: true,
    variacaoIds,
    sku,
    variacaoSkus,
    marca,
    titulo: data.title || "",
    precoDe,
    precoPor,
    frete,
    freteAnterior,
    freteMudou,
    comissao,
    comissaoPct,
    status: data.status || null,
    dataCriacao: formatDate(data.date_created),
    tipoAnuncio: mapListingType(data.listing_type_id),
    visitas,
    vendas: data.sold_quantity || 0,
    estoque: data.available_quantity || 0,
    catalogo: !!data.catalog_listing,
    full: data.shipping?.logistic_type === "fulfillment",
    categoria1,
    categoria2,
    categoria3,
    categoria4,
  };

  const item = await prisma.item.upsert({
    where: { mlb },
    update: payload,
    create: { mlb, ...payload },
  });

  // Historico de frete (registra sempre que houver valor)
  if (frete != null) {
    const last = await prisma.shippingHistory.findFirst({
      where: { itemId: item.id },
      orderBy: { capturedAt: "desc" },
    });
    if (!last || last.cost !== frete) {
      await prisma.shippingHistory.create({
        data: { itemId: item.id, mlb, cost: frete },
      });
    }
  }

  if (existing) {
    syncState.atualizados++;
    if (freteMudou) syncState.fretesMudaram++;
  } else {
    syncState.novos++;
  }
}

// ================= Settings =================
export async function getSettings() {
  let s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) {
    s = await prisma.settings.create({ data: { id: 1 } });
  }
  return s;
}

export async function updateZipCode(zipCode) {
  const clean = String(zipCode).replace(/\D/g, "") || "01001000";
  return prisma.settings.upsert({
    where: { id: 1 },
    update: { zipCode: clean },
    create: { id: 1, zipCode: clean },
  });
}
