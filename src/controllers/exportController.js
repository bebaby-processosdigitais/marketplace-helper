import { buildItemsWorkbook } from "../services/exportService.js";

export async function exportExcel(req, res) {
  const { search } = req.query;
  const wb = await buildItemsWorkbook(req.user.id, search || "");

  const date = new Date().toISOString().slice(0, 10);
  const filename = `anuncios_${date}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await wb.xlsx.write(res);
  res.end();
}
