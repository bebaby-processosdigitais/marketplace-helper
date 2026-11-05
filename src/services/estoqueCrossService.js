// Cruzamento do estoque do ERP (Sankhya) com os anúncios do Mercado Livre.
//
// Fluxo: o usuário sobe a planilha de estoque (export do Sankhya, formato longo
// — uma linha por SKU × local). Agrupamos por SKU (coluna "Código"), que é a
// mesma chave do campo `sku` dos anúncios, e geramos um relatório cruzado para
// decidir reposição do estoque 103 (SITE MATRIZ = o que reflete o marketplace).
import pkg from "xlsx";
const XLSX = pkg.default || pkg;
import prisma from "../config/prisma.js";

// Locais que viram coluna no relatório (ordem fixa). O nome pode ser
// sobrescrito pelo que vier na planilha, mas o código é a chave.
export const LOCAIS = [
  { cod: 101, nome: "ESTOQUE GERAL", grupo: "SP" },
  { cod: 103, nome: "SITE MATRIZ", grupo: "SP", marketplace: true },
  { cod: 201, nome: "ESTOQUE GERAL", grupo: "SUL" },
  { cod: 203, nome: "SITE FILIAL", grupo: "SUL" },
  { cod: 204, nome: "ESTOQUE - B2B", grupo: "SUL" },
];
export const COD_FULL = 106; // FULL MERCADO LIVRE -> coluna "Estoque Full"
export const COD_103 = 103; // estoque que reflete o marketplace
export const LIMIAR_103 = 5; // abaixo (ou igual) disso, 103 é "baixo"

// ---- helpers ----
const semAcento = (s) =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// Normaliza a chave de SKU/Código: "2295.0" -> "2295"; "43" -> "43";
// alfanumérico vira maiúsculo sem espaços nas pontas.
export function normKey(x) {
  const s = String(x ?? "").trim();
  const m = s.match(/^(\d+)(?:\.0+)?$/);
  if (m) return String(parseInt(m[1], 10));
  return s.toUpperCase();
}

function toInt(x) {
  if (x === "" || x == null) return 0;
  const n = typeof x === "number" ? x : parseFloat(String(x).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const STATUS_LABEL = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
  under_review: "Em revisão",
  inactive: "Inativo",
};
const statusLabel = (s) => (s ? STATUS_LABEL[s] || s : "");

// Lê o workbook do ERP (Buffer) e devolve os dados agrupados por SKU.
export function parseErpWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("A planilha está vazia.");
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false });

  // Data de emissão (se o Sankhya colocou no topo).
  let emissao = null;
  const metaCell = rows.flat().find((c) => /emiss/i.test(String(c)));
  if (metaCell) {
    const m = String(metaCell).match(/(\d{2}\/\d{2}\/\d{4}[\s\d:]*)/);
    if (m) emissao = m[1].trim();
  }

  // Cabeçalho: linha que tem "Produto" e "Local".
  const hi = rows.findIndex(
    (r) => r.some((c) => /produto/i.test(String(c))) && r.some((c) => /local/i.test(String(c)))
  );
  if (hi < 0) {
    throw new Error(
      "Não encontrei o cabeçalho (Código / Produto / Estoque / Cód Local / Local). Confira se é o relatório de estoque do Sankhya."
    );
  }
  const Hn = rows[hi].map(semAcento);
  const iCod = Hn.findIndex((x) => x.startsWith("codigo"));
  const iProd = Hn.indexOf("produto");
  const iEst = Hn.indexOf("estoque");
  const iLoc = Hn.findIndex((x) => x === "cod local" || (x.includes("local") && x.includes("cod")));
  const iNome = Hn.lastIndexOf("local");
  if (iCod < 0 || iProd < 0 || iEst < 0 || iLoc < 0) {
    throw new Error("Cabeçalho incompleto: preciso de Código, Produto, Estoque e Cód Local.");
  }

  const codNomes = {}; // cod -> nome do local (como veio no arquivo)
  const porSku = {}; // key -> { codigo, produto, est: { cod: inteiro } }
  let totalLinhas = 0;

  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    const codigo = row[iCod];
    if (codigo === "" || codigo == null) continue;
    const key = normKey(codigo);
    if (!key) continue;
    totalLinhas++;

    const locCod = toInt(row[iLoc]);
    const locNome = String(row[iNome] ?? "").trim();
    if (locCod && locNome) codNomes[locCod] = locNome;

    const est = toInt(row[iEst]);
    if (!porSku[key]) porSku[key] = { codigo: key, produto: String(row[iProd] ?? "").trim(), est: {} };
    const g = porSku[key];
    if (!g.produto && row[iProd]) g.produto = String(row[iProd]).trim();
    if (locCod) g.est[locCod] = (g.est[locCod] || 0) + est;
  }

  return { emissao, totalSkus: Object.keys(porSku).length, totalLinhas, codNomes, porSku };
}

// Cruza os dados do ERP (já parseados) com os anúncios do usuário.
export async function buildCross(userId, erp) {
  const items = await prisma.item.findMany({
    where: { userId },
    select: { sku: true, mlb: true, titulo: true, full: true, catalogo: true, estoque: true, status: true, fullAptas: true, fullNaoAptas: true },
  });

  // Agrupa anúncios por SKU.
  const mlMap = new Map();
  for (const it of items) {
    if (it.sku == null || String(it.sku).trim() === "") continue;
    const key = normKey(it.sku);
    if (!mlMap.has(key)) {
      mlMap.set(key, { sku: key, mlbs: [], titulos: {}, catalogo: false, full: false, estoque: 0, status: null, _ativo: false, fullMlAptas: null, fullMlNaoAptas: null });
    }
    const g = mlMap.get(key);
    g.mlbs.push(it.mlb);
    if (it.titulo) g.titulos[it.titulo] = (g.titulos[it.titulo] || 0) + 1;
    if (it.catalogo) g.catalogo = true;
    if (it.full) g.full = true;
    g.estoque = Math.max(g.estoque, it.estoque || 0);
    if (it.fullAptas != null) g.fullMlAptas = (g.fullMlAptas || 0) + it.fullAptas;
    if (it.fullNaoAptas != null) g.fullMlNaoAptas = (g.fullMlNaoAptas || 0) + it.fullNaoAptas;
    if (it.status === "active" && !g._ativo) { g.status = "active"; g._ativo = true; }
    else if (!g.status) g.status = it.status;
  }

  const porSku = erp.porSku || {};
  const keys = new Set([...mlMap.keys(), ...Object.keys(porSku)]);

  const rows = [];
  for (const key of keys) {
    const ml = mlMap.get(key);
    const e = porSku[key];
    const est = (cod) => (e && e.est ? e.est[cod] || 0 : 0);

    const est101 = est(101), est103 = est(103), est201 = est(201), est203 = est(203), est204 = est(204);
    const estoqueFull = est(COD_FULL);
    const sul = est201 + est203 + est204;
    const totalErp = est101 + est103 + est201 + est203 + est204 + estoqueFull;
    const cadastrado = !!ml;

    let sugestao = "";
    if (!cadastrado && totalErp > 0) sugestao = "Cadastrar anúncio no ML";
    else if (cadastrado && est103 <= LIMIAR_103) {
      if (est101 > 0) sugestao = "Mover 101 → 103 (SP)";
      else if (sul > 0) sugestao = "Carreta Filial Sul → 103";
      else if (estoqueFull > 0) sugestao = "Puxar do Full p/ 103";
      else sugestao = "Sem estoque — repor";
    }

    rows.push({
      mlbs: ml ? ml.mlbs.join(", ") : "",
      sku: key,
      titulo: ml ? Object.entries(ml.titulos).sort((a, b) => b[1] - a[1])[0]?.[0] || "" : "",
      temCatalogo: ml ? ml.catalogo : null,
      estaNoFull: ml ? ml.full : null,
      estoque: ml ? ml.estoque : null,
      estoqueFull,
      fullMlAptas: ml ? ml.fullMlAptas : null,
      fullMlNaoAptas: ml ? ml.fullMlNaoAptas : null,
      status: ml ? statusLabel(ml.status) : "",
      cadastrado,
      produtoErp: e ? e.produto : "",
      est101, est103, est201, est203, est204,
      totalErp,
      sugestao,
    });
  }

  // Prioriza o que exige ação: não cadastrados com estoque, depois 103 baixo.
  const prio = (r) => {
    if (!r.cadastrado && r.totalErp > 0) return 0;
    if (r.cadastrado && r.est103 <= LIMIAR_103 && r.totalErp > 0) return 1;
    if (r.cadastrado && r.est103 <= LIMIAR_103) return 2;
    return 3;
  };
  rows.sort(
    (a, b) =>
      prio(a) - prio(b) ||
      a.est103 - b.est103 ||
      (parseInt(a.sku, 10) || 1e12) - (parseInt(b.sku, 10) || 1e12)
  );

  const stats = {
    totalLinhas: rows.length,
    naoCadastrados: rows.filter((r) => !r.cadastrado && r.totalErp > 0).length,
    baixo103: rows.filter((r) => r.cadastrado && r.est103 <= LIMIAR_103).length,
    baixo103ComAlternativa: rows.filter(
      (r) => r.cadastrado && r.est103 <= LIMIAR_103 && r.est101 + r.est201 + r.est203 + r.est204 + r.estoqueFull > 0
    ).length,
    semEstoque: rows.filter((r) => r.cadastrado && r.totalErp === 0).length,
  };

  const locais = LOCAIS.map((l) => ({ ...l, nome: (erp.codNomes && erp.codNomes[l.cod]) || l.nome }));
  const fullNome = (erp.codNomes && erp.codNomes[COD_FULL]) || "FULL MERCADO LIVRE";

  return { rows, stats, locais, fullNome, emissao: erp.emissao, limiar103: LIMIAR_103 };
}
