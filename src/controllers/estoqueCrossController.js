import { getAuthStatus } from "../services/mlAuth.js";
import { parseErpWorkbook, buildCross } from "../services/estoqueCrossService.js";
import { buildEstoqueCrossWorkbook } from "../services/exportService.js";
import { salvarUpload, obterUpload, apagarUpload } from "../services/estoqueStore.js";

// Renderiza a tela: se houver planilha guardada, cruza com os anúncios e
// mostra o preview + estatísticas. Caso contrário, só o formulário de upload.
async function renderPage(req, res, extra = {}) {
  const userId = req.user.id;
  const status = await getAuthStatus(userId);
  const upload = await obterUpload(userId);
  let cross = null;
  if (upload) cross = await buildCross(userId, upload);
  res.render("estoque-full", {
    title: "Estoque Full/Cross/Carreta",
    active: "estoque-full",
    authenticated: status.authenticated,
    upload: upload
      ? { originalName: upload.originalName, uploadedAt: upload.uploadedAt, totalSkus: upload.totalSkus, totalLinhas: upload.totalLinhas, emissao: upload.emissao }
      : null,
    cross,
    erro: extra.erro || null,
    ok: extra.ok || null,
  });
}

export async function showEstoqueFull(req, res) {
  await renderPage(req, res, { ok: req.query.ok ? "Planilha processada com sucesso." : null });
}

export async function uploadEstoqueFull(req, res) {
  if (!req.file || !req.file.buffer) {
    return renderPage(req, res, { erro: "Selecione um arquivo .xls ou .xlsx para enviar." });
  }
  try {
    const parsed = parseErpWorkbook(req.file.buffer);
    if (!parsed.totalSkus) {
      return renderPage(req, res, { erro: "Nenhum SKU encontrado na planilha. Confira o arquivo." });
    }
    await salvarUpload(req.user.id, {
      ...parsed,
      originalName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
    });
    res.redirect("/telas/estoque-full?ok=1");
  } catch (e) {
    await renderPage(req, res, { erro: e.message || "Falha ao ler a planilha." });
  }
}

export async function gerarRelatorioEstoque(req, res) {
  const upload = await obterUpload(req.user.id);
  if (!upload) return res.redirect("/telas/estoque-full");
  const cross = await buildCross(req.user.id, upload);
  const wb = buildEstoqueCrossWorkbook(cross);

  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const nome = `estoque_cross_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
  await wb.xlsx.write(res);
  res.end();
}

export async function limparEstoque(req, res) {
  await apagarUpload(req.user.id);
  res.redirect("/telas/estoque-full");
}
