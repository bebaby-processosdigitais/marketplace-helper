import { listProducts, setCostForSku } from "../services/productService.js";
import { getAuthStatus } from "../services/mlAuth.js";

export async function showProducts(req, res) {
  const userId = req.user.id;
  const { page, search } = req.query;
  const data = await listProducts({ userId, page, search });
  const status = await getAuthStatus(userId);
  res.render("products", {
    title: "Produtos",
    ...data,
    authenticated: status.authenticated,
  });
}

export async function saveProductCost(req, res) {
  const { sku, custo } = req.body;
  if (!sku) return res.status(400).json({ error: "SKU ausente." });
  const result = await setCostForSku(req.user.id, sku, custo);
  res.json({ ok: true, ...result });
}
