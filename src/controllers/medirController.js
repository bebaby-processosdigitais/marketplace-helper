import { getAuthStatus } from "../services/mlAuth.js";
import prisma from "../config/prisma.js";

export async function showMedir(req, res) {
  const userId = req.user.id;
  const status = await getAuthStatus(userId);

  // SKUs existentes (para sugerir no campo da simulação).
  const rows = await prisma.item.findMany({
    where: { userId, sku: { not: null } },
    select: { sku: true },
    distinct: ["sku"],
    orderBy: { sku: "asc" },
  });
  const skus = [...new Set(rows.map((r) => (r.sku || "").trim()).filter(Boolean))];

  res.render("medir", {
    title: "Medição",
    authenticated: status.authenticated,
    skus,
  });
}
