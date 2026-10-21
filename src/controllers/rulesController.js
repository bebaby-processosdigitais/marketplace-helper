import { getBusinessRules, updateBusinessRules } from "../services/rulesService.js";
import { getAuthStatus } from "../services/mlAuth.js";

export async function showRules(req, res) {
  const rules = await getBusinessRules();
  const status = await getAuthStatus();
  res.render("rules", {
    title: "Regras de Negócio",
    rules,
    authenticated: status.authenticated,
    message: req.query.message || null,
  });
}

export async function saveRules(req, res) {
  await updateBusinessRules(req.body);
  res.redirect("/regras?message=" + encodeURIComponent("Regras salvas com sucesso!"));
}
