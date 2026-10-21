import ExcelJS from "exceljs";
import prisma from "../config/prisma.js";
import { buildItemWhere } from "./itemService.js";

// Gera um workbook Excel com os itens (respeita o filtro de busca)
export async function buildItemsWorkbook(search) {
  const items = await prisma.item.findMany({
    where: buildItemWhere(search),
    orderBy: { updatedAt: "desc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Marketplace Helper";
  wb.created = new Date();

  const ws = wb.addWorksheet("Anuncios");

  ws.columns = [
    { header: "MLB", key: "mlb", width: 16 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "TITULO", key: "titulo", width: 50 },
    { header: "MARCA", key: "marca", width: 18 },
    { header: "PRECO DE", key: "precoDe", width: 12 },
    { header: "PRECO POR", key: "precoPor", width: 12 },
    { header: "FRETE", key: "frete", width: 10 },
    { header: "FRETE ANTERIOR", key: "freteAnterior", width: 14 },
    { header: "FRETE MUDOU", key: "freteMudou", width: 12 },
    { header: "COMISSAO", key: "comissao", width: 10 },
    { header: "COMISSAO %", key: "comissaoPct", width: 11 },
    { header: "CUSTO ML", key: "custoML", width: 10 },
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
    const custoML = it.comissao != null ? it.comissao + (it.frete || 0) : null;
    ws.addRow({
      ...it,
      custoML,
      full: it.full ? "SIM" : "NAO",
      catalogo: it.catalogo ? "SIM" : "NAO",
      freteMudou: it.freteMudou ? "SIM" : "NAO",
    });
  }

  ws.autoFilter = { from: "A1", to: "Z1" };

  return wb;
}
