import prisma from "../config/prisma.js";
import { listItems } from "../services/itemService.js";
import { getSettings } from "../services/syncService.js";
import { getBusinessRules } from "../services/rulesService.js";
import { computeProfit } from "../services/calcService.js";
import { getAuthStatus } from "../services/mlAuth.js";

export async function showItems(req, res) {
  const userId = req.user.id;
  const { page, search, sort, dir } = req.query;
  const data = await listItems({ userId, page, search, sort, dir });
  const settings = await getSettings(userId);
  const status = await getAuthStatus(userId);

  res.render("items", {
    title: "Anuncios",
    ...data,
    zipCode: settings.zipCode,
    authenticated: status.authenticated,
  });
}

// Salva o custo manual do produto e devolve os valores recalculados
export async function saveCusto(req, res) {
  const userId = req.user.id;
  const { mlb, custo } = req.body;
  if (!mlb) return res.status(400).json({ error: "MLB ausente." });

  const parsed = parseFloat(String(custo ?? "").replace(",", "."));
  const custoProduto = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;

  const item = await prisma.item.update({
    where: { userId_mlb: { userId, mlb } },
    data: { custoProduto },
  });

  const rules = await getBusinessRules(userId);
  const calc = computeProfit(item, rules);

  res.json({
    ok: true,
    custoProduto,
    lucro: calc.lucro,
    margem: calc.margem,
    custoML: calc.custoML,
  });
}
