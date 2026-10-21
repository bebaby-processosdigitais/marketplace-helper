import prisma from "../config/prisma.js";
import { config } from "../config/env.js";

const OAUTH_URL = "https://api.mercadolibre.com/oauth/token";

// URL para o usuario autorizar o app no Mercado Livre
export function getAuthorizationUrl() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.appId,
    redirect_uri: config.redirectUri,
  });
  return `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
}

// Troca o "code" (retornado na URL de redirect) por tokens de acesso
export async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.appId,
    client_secret: config.appSecret,
    code,
    redirect_uri: config.redirectUri,
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

  return saveTokens(data);
}

// Renova o access_token usando o refresh_token
export async function refreshAccessToken() {
  const current = await prisma.token.findUnique({ where: { id: 1 } });
  if (!current?.refreshToken) {
    throw new Error("Token invalido. Reautentique o app.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.appId,
    client_secret: config.appSecret,
    refresh_token: current.refreshToken,
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

  return saveTokens(data);
}

// Persiste os tokens no banco (linha unica id=1)
async function saveTokens(data) {
  const payload = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user_id ? String(data.user_id) : undefined,
    expiresIn: data.expires_in || 21600,
    savedAt: new Date(),
  };

  return prisma.token.upsert({
    where: { id: 1 },
    update: payload,
    create: { id: 1, ...payload },
  });
}

// Verifica se o token expirou (com margem de 5 minutos)
function isExpired(token) {
  const savedAt = new Date(token.savedAt).getTime();
  const ttl = (token.expiresIn - 300) * 1000;
  return Date.now() - savedAt >= ttl;
}

// Retorna um access_token valido, renovando se necessario
export async function getValidToken() {
  let token = await prisma.token.findUnique({ where: { id: 1 } });
  if (!token) {
    throw new Error("Voce precisa autorizar o app primeiro.");
  }
  if (isExpired(token)) {
    console.log("[INFO] Token expirado, renovando...");
    token = await refreshAccessToken();
  }
  return token.accessToken;
}

// Diz se ja existe autenticacao valida (para a UI)
export async function getAuthStatus() {
  const token = await prisma.token.findUnique({ where: { id: 1 } });
  if (!token) return { authenticated: false };
  return {
    authenticated: true,
    userId: token.userId,
    expired: isExpired(token),
    savedAt: token.savedAt,
  };
}
