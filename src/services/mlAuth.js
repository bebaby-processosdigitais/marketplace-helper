import prisma from "../config/prisma.js";

const OAUTH_URL = "https://api.mercadolibre.com/oauth/token";

// Retorna a conta ML do usuario (cria vazia se nao existir)
export async function getMlAccount(userId) {
  let acc = await prisma.mlAccount.findUnique({ where: { userId } });
  if (!acc) acc = await prisma.mlAccount.create({ data: { userId } });
  return acc;
}

// Salva as credenciais do app (App ID, Secret, Redirect URI) do usuario
export async function saveCredentials(userId, { appId, appSecret, redirectUri }) {
  const data = {
    appId: (appId || "").trim(),
    appSecret: (appSecret || "").trim(),
    redirectUri: (redirectUri || "").trim(),
  };
  return prisma.mlAccount.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

// URL para autorizar o app (null se faltam credenciais)
export async function getAuthorizationUrl(userId) {
  const acc = await getMlAccount(userId);
  if (!acc.appId || !acc.redirectUri) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: acc.appId,
    redirect_uri: acc.redirectUri,
  });
  return `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
}

// Troca o code por tokens
export async function exchangeCodeForTokens(userId, code) {
  const acc = await getMlAccount(userId);
  if (!acc.appId || !acc.appSecret || !acc.redirectUri) {
    throw new Error("Cadastre App ID, Secret e Redirect URI antes de autorizar.");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: acc.appId,
    client_secret: acc.appSecret,
    code,
    redirect_uri: acc.redirectUri,
  });

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Erro ao autenticar: ${JSON.stringify(data)}`);
  }
  return saveTokens(userId, data);
}

// Renova o access_token
export async function refreshAccessToken(userId) {
  const acc = await getMlAccount(userId);
  if (!acc.refreshToken) {
    throw new Error("Token inválido. Reautentique o app.");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: acc.appId,
    client_secret: acc.appSecret,
    refresh_token: acc.refreshToken,
  });

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Erro ao atualizar token: ${JSON.stringify(data)}`);
  }
  return saveTokens(userId, data);
}

async function saveTokens(userId, data) {
  return prisma.mlAccount.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      mlUserId: data.user_id ? String(data.user_id) : undefined,
      expiresIn: data.expires_in || 21600,
      savedAt: new Date(),
    },
  });
}

function isExpired(acc) {
  if (!acc.savedAt) return true;
  const savedAt = new Date(acc.savedAt).getTime();
  const ttl = (acc.expiresIn - 300) * 1000;
  return Date.now() - savedAt >= ttl;
}

// Retorna um access_token valido (renova se necessario)
export async function getValidToken(userId) {
  let acc = await prisma.mlAccount.findUnique({ where: { userId } });
  if (!acc || !acc.accessToken) {
    throw new Error("Você precisa autorizar o app primeiro.");
  }
  if (isExpired(acc)) {
    acc = await refreshAccessToken(userId);
  }
  return acc.accessToken;
}

// Status para a UI
export async function getAuthStatus(userId) {
  const acc = await prisma.mlAccount.findUnique({ where: { userId } });
  const hasCredentials = !!(acc && acc.appId && acc.appSecret && acc.redirectUri);
  const base = {
    hasCredentials,
    appId: acc?.appId || "",
    appSecret: acc?.appSecret || "",
    redirectUri: acc?.redirectUri || "",
  };
  if (!acc || !acc.accessToken) {
    return { ...base, authenticated: false };
  }
  return {
    ...base,
    authenticated: true,
    mlUserId: acc.mlUserId,
    expired: isExpired(acc),
    savedAt: acc.savedAt,
  };
}
