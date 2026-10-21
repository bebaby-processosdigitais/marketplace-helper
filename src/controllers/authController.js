import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getAuthStatus,
  saveCredentials,
} from "../services/mlAuth.js";

export async function showAuthPage(req, res) {
  const userId = req.user.id;
  const status = await getAuthStatus(userId);
  const authUrl = await getAuthorizationUrl(userId);
  res.render("auth", {
    title: "Autorizacao",
    status,
    authUrl,
    authenticated: status.authenticated,
    message: req.query.message || null,
    error: req.query.error || null,
  });
}

// Salva App ID, Secret e Redirect URI do usuario
export async function saveMlCredentials(req, res) {
  const { appId, appSecret, redirectUri } = req.body;
  if (!appId || !appSecret || !redirectUri) {
    return res.redirect("/auth?error=" + encodeURIComponent("Preencha App ID, Secret e Redirect URI."));
  }
  await saveCredentials(req.user.id, { appId, appSecret, redirectUri });
  res.redirect("/auth?message=" + encodeURIComponent("Credenciais salvas. Agora autorize o app."));
}

// Aceita o code puro (TG-...) OU a URL inteira de redirect colada
function extractCode(raw) {
  if (!raw) return "";
  let value = raw.trim();
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
    await exchangeCodeForTokens(req.user.id, code);
    res.redirect("/auth?message=" + encodeURIComponent("App autorizado com sucesso!"));
  } catch (e) {
    res.redirect("/auth?error=" + encodeURIComponent(e.message));
  }
}

// Callback automatico (fallback; so se a redirect URI apontar pra este app)
export async function oauthCallback(req, res) {
  const { code, error } = req.query;
  if (error) return res.redirect("/auth?error=" + encodeURIComponent(error));
  if (!code) return res.redirect("/auth?error=" + encodeURIComponent("Nenhum codigo recebido do Mercado Livre."));
  try {
    await exchangeCodeForTokens(req.user.id, code);
    res.redirect("/auth?message=" + encodeURIComponent("App autorizado com sucesso!"));
  } catch (e) {
    res.redirect("/auth?error=" + encodeURIComponent(e.message));
  }
}
