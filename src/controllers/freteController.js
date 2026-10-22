import { getAuthStatus } from "../services/mlAuth.js";

export async function showFrete(req, res) {
  const status = await getAuthStatus(req.user.id);
  res.render("frete", {
    title: "Calculadora de Frete",
    authenticated: status.authenticated,
  });
}
