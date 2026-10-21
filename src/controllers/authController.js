import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getAuthStatus,
} from "../services/mlAuth.js";
import { config } from "../config/env.js";

export async function showAuthPage(req, res) {
  const status = await getAuthStatus();
  res.render("auth", {
    title: "Autorizacao",
    authUrl: getAuthorizationUrl(),
    redirectUri: config.redirectUri,
    status,
    message: req.query.message || null,
    error: req.query.error || null,
  });
}

// Aceita o code puro (TG-...) OU a URL inteira de redirect colada pela usuaria
function extractCode(raw) {
  if (!raw) return "";
  let value = raw.trim();

  // Se colou a URL inteira, pega o parametro ?code=...
  if (value.includes("code=")) {
    try {
      const url = new URL(value.includes("://") ? value : "https://x/?" + value.replace(/^\?/, ""));
      const fromParam = url.searchParams.get("code");
      if (fromParam) return fromParam.trim();
    } catch (_) {
      const m = value.match(/[?&]code=([^&\s]+)/);
      if (m) return decodeURIComponent(m[1]).trim();
    }
  }

  return value;
}

export async function submitCode(req, res) {
  const code = extractCode(req.body.code);
  if (!code) {
    return res.redirect("/auth?error=" + encodeURIComponent("Informe o codigo."));
  }
  try {
    await exchangeCodeForTokens(code);
    res.redirect("/auth?message=" + encodeURIComponent("App autorizado com sucesso!"));
  } catch (e) {
    res.redirect("/auth?error=" + encodeURIComponent(e.message));
  }
}

// Callback automatico: o ML redireciona pra ca com ?code=... apos autorizar
// (fallback; so funciona se a redirect URI apontar para este app)
export async function oauthCallback(req, res) {
  const { code, error } = req.query;
  if (error) {
    return res.redirect("/auth?error=" + encodeURIComponent(error));
  }
  if (!code) {
    return res.redirect("/auth?error=" + encodeURIComponent("Nenhum codigo recebido do Mercado Livre."));
  }
  try {
    await exchangeCodeForTokens(code);
    res.redirect("/auth?message=" + encodeURIComponent("App autorizado com sucesso!"));
  } catch (e) {
    res.redirect("/auth?error=" + encodeURIComponent(e.message));
  }
}
