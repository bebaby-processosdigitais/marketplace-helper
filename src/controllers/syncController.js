import { runSync, getSyncState, updateZipCode } from "../services/syncService.js";
import { getAuthStatus } from "../services/mlAuth.js";

// Dispara o sync completo (todos os anuncios) em background
export async function startSync(req, res) {
  const status = await getAuthStatus();
  if (!status.authenticated) {
    return res.status(401).json({ error: "Autorize o app primeiro." });
  }
  const state = await runSync();
  res.json({ ok: true, state });
}

// Dispara o sync apenas dos anuncios selecionados
export async function startSyncSelection(req, res) {
  const status = await getAuthStatus();
  if (!status.authenticated) {
    return res.status(401).json({ error: "Autorize o app primeiro." });
  }
  const mlbs = Array.isArray(req.body?.mlbs) ? req.body.mlbs : [];
  if (mlbs.length === 0) {
    return res.status(400).json({ error: "Nenhum anuncio selecionado." });
  }
  const state = await runSync(mlbs);
  res.json({ ok: true, state });
}

// Consulta o progresso do sync
export function syncStatus(req, res) {
  res.json(getSyncState());
}

// Atualiza o CEP usado no calculo de frete
export async function saveZipCode(req, res) {
  const { zipCode } = req.body;
  await updateZipCode(zipCode);
  res.redirect(req.get("referer") || "/");
}
