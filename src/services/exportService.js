import ExcelJS from "exceljs";
import prisma from "../config/prisma.js";
import { buildItemWhere } from "./itemService.js";
import { getBusinessRules } from "./rulesService.js";
import { computeProfit } from "./calcService.js";
import { getProductsForExport } from "./productService.js";

// Gera um workbook Excel com os itens do usuario (respeita o filtro de busca)
export async function buildItemsWorkbook(userId, search) {
  const items = await prisma.item.findMany({
    where: buildItemWhere(userId, search),
    orderBy: { updatedAt: "desc" },
  });
  const rules = await getBusinessRules(userId);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Marketplace Helper";
  wb.created = new Date();

  const ws = wb.addWorksheet("Anuncios");

  ws.columns = [
    { header: "MLB", key: "mlb", width: 16 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "TITULO", key: "titulo", width: 50 },
    { header: "MARCA", key: "marca", width: 18 },
    { header: "CUSTO PRODUTO", key: "custoProduto", width: 14 },
    { header: "PRECO DE", key: "precoDe", width: 12 },
    { header: "PRECO POR", key: "precoPor", width: 12 },
    { header: "FRETE", key: "frete", width: 10 },
    { header: "FRETE ANTERIOR", key: "freteAnterior", width: 14 },
    { header: "FRETE MUDOU", key: "freteMudou", width: 12 },
    { header: "COMISSAO", key: "comissao", width: 10 },
    { header: "COMISSAO %", key: "comissaoPct", width: 11 },
    { header: "CUSTO ML", key: "custoML", width: 10 },
    { header: "IMPOSTOS", key: "impostos", width: 10 },
    { header: "LUCRO LIQUIDO", key: "lucro", width: 14 },
    { header: "MARGEM %", key: "margem", width: 10 },
    { header: "STATUS", key: "status", width: 12 },
    { header: "TIPO", key: "tipoAnuncio", width: 12 },
    { header: "VISITAS", key: "visitas", width: 10 },
    { header: "VENDAS", key: "vendas", width: 10 },
    { header: "ESTOQUE", key: "estoque", width: 10 },
    { header: "FULL", key: "full", width: 8 },
    { header: "CATALOGO", key: "catalogo", width: 10 },
    { header: "VARIACAO IDS", key: "variacaoIds", width: 20 },
    { header: "VARIACAO SKUS", key: "variacaoSkus", width: 20 },
    { header: "DATA CRIACAO", key: "dataCriacao", width: 14 },
    { header: "CATEGORIA 1", key: "categoria1", width: 20 },
    { header: "CATEGORIA 2", key: "categoria2", width: 20 },
    { header: "CATEGORIA 3", key: "categoria3", width: 20 },
    { header: "CATEGORIA 4", key: "categoria4", width: 20 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFE600" },
  };

  for (const it of items) {
    const calc = computeProfit(it, rules);
    ws.addRow({
      ...it,
      custoML: calc.custoML,
      impostos: calc.impostos != null ? Number(calc.impostos.toFixed(2)) : null,
      lucro: calc.lucro != null ? Number(calc.lucro.toFixed(2)) : null,
      margem: calc.margem != null ? Number(calc.margem.toFixed(1)) : null,
      full: it.full ? "SIM" : "NAO",
      catalogo: it.catalogo ? "SIM" : "NAO",
      freteMudou: it.freteMudou ? "SIM" : "NAO",
    });
  }

  ws.autoFilter = { from: "A1", to: "AD1" };

  return wb;
}

// Gera um workbook Excel com os produtos (por SKU): custo, medidas, tamanho no
// Full e comparação de frete cobrado × real. Respeita o filtro de busca.
export async function buildProductsWorkbook(userId, search) {
  const produtos = await getProductsForExport(userId, search || "");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Marketplace Helper";
  wb.created = new Date();
  const ws = wb.addWorksheet("Produtos");

  ws.columns = [
    { header: "SKU", key: "sku", width: 20 },
    { header: "PRODUTO", key: "nome", width: 46 },
    { header: "ANUNCIOS", key: "qtd", width: 10 },
    { header: "CUSTO", key: "custo", width: 12 },
    { header: "LARGURA (cm)", key: "largura", width: 13 },
    { header: "ALTURA (cm)", key: "altura", width: 12 },
    { header: "COMPRIMENTO (cm)", key: "comprimento", width: 16 },
    { header: "PESO (kg)", key: "pesoReal", width: 11 },
    { header: "SOMA LADOS (cm)", key: "somaLados", width: 15 },
    { header: "TAMANHO FULL", key: "tamanhoFull", width: 15 },
    { header: "DENTRO DO FULL", key: "dentroDoFull", width: 15 },
    { header: "FRETE COBRADO", key: "freteCobrado", width: 14 },
    { header: "FRETE REAL", key: "freteReal", width: 12 },
    { header: "DIVERGENCIA", key: "delta", width: 13 },
    { header: "FRETE STATUS", key: "freteStatus", width: 16 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE600" } };

  const num = (v, d = 2) => (v != null ? Number(Number(v).toFixed(d)) : null);

  for (const p of produtos) {
    const freteStatus = !p.temMedidas
      ? "Sem medidas"
      : p.freteCobrado == null
        ? "Sem cobrado"
        : p.divergente
          ? "Divergente"
          : "OK";
    ws.addRow({
      sku: p.sku,
      nome: p.nome,
      qtd: p.qtd,
      custo: num(p.custo),
      largura: p.largura ?? null,
      altura: p.altura ?? null,
      comprimento: p.comprimento ?? null,
      pesoReal: p.pesoReal ?? null,
      somaLados: p.somaLados ?? null,
      tamanhoFull: p.tamanhoFull ?? "—",
      dentroDoFull: p.tamanhoFull == null ? "—" : (p.dentroDoFull ? "SIM" : "NAO"),
      freteCobrado: num(p.freteCobrado),
      freteReal: num(p.freteReal),
      delta: p.delta != null ? num(Math.abs(p.delta)) : null,
      freteStatus,
    });
  }

  ws.autoFilter = { from: "A1", to: "O1" };
  return wb;
}

// Gera o workbook do relatório "Estoque Full/Cross/Carreta".
// `cross` vem de buildCross(): { rows, locais, stats, emissao }.
export function buildEstoqueCrossWorkbook(cross) {
  const { rows, locais, emissao } = cross;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Marketplace Helper";
  wb.created = new Date();

  const agora = new Date();
  const carimbo = agora.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const ws = wb.addWorksheet("Estoque Cross");

  // Colunas: bloco ML + bloco ERP (uma coluna por local) + sugestão.
  const cols = [
    { header: "MLBS", key: "mlbs", width: 26 },
    { header: "SKU", key: "sku", width: 10 },
    { header: "TITULO DO ANUNCIO", key: "titulo", width: 46 },
    { header: "TEM CATALOGO?", key: "catalogo", width: 14 },
    { header: "ESTA NO FULL?", key: "full", width: 13 },
    { header: "ESTOQUE (ML)", key: "estoque", width: 13 },
    { header: "FULL ML APTAS", key: "fullMlAptas", width: 13 },
    { header: "ESTOQUE FULL (ERP)", key: "estoqueFull", width: 16 },
    { header: "STATUS", key: "status", width: 12 },
    { header: "CADASTRADO NO ML?", key: "cadastrado", width: 17 },
    { header: "PRODUTO (ERP)", key: "produtoErp", width: 42 },
  ];
  for (const l of locais) cols.push({ header: `${l.cod} - ${l.nome}`, key: `est${l.cod}`, width: 16 });
  cols.push({ header: "SUGESTAO", key: "sugestao", width: 24 });
  ws.columns = cols;

  // Linha de título com o carimbo de data/hora (acima do cabeçalho).
  const totalCols = cols.length;
  const lastColLetter = ws.getColumn(totalCols).letter;
  ws.spliceRows(1, 0, [`Relatório Estoque Full/Cross/Carreta — gerado em ${carimbo}${emissao ? " · emissão ERP: " + emissao : ""}`]);
  ws.mergeCells(`A1:${lastColLetter}1`);
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.getCell("A1").alignment = { vertical: "middle" };
  ws.getRow(1).height = 22;

  // Cabeçalho (agora na linha 2).
  const head = ws.getRow(2);
  head.font = { bold: true };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE600" } };

  const bool = (v) => (v == null ? "" : v ? "SIM" : "NAO");
  for (const r of rows) {
    const data = {
      mlbs: r.mlbs,
      sku: r.sku,
      titulo: r.titulo,
      catalogo: bool(r.temCatalogo),
      full: bool(r.estaNoFull),
      estoque: r.estoque ?? "",
      fullMlAptas: r.fullMlAptas ?? "",
      estoqueFull: r.estoqueFull,
      status: r.status,
      cadastrado: r.cadastrado ? "SIM" : "NAO",
      produtoErp: r.produtoErp,
      sugestao: r.sugestao,
    };
    for (const l of locais) data[`est${l.cod}`] = r[`est${l.cod}`];
    ws.addRow(data);
  }

  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: totalCols } };
  ws.views = [{ state: "frozen", ySplit: 2 }];
  return wb;
}
