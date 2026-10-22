import crypto from "node:crypto";
import { config } from "./env.js";

// Chave de 32 bytes derivada da ENCRYPTION_KEY (ou do SESSION_SECRET como fallback).
const keyMaterial = process.env.ENCRYPTION_KEY || config.sessionSecret || "chave-padrao-troque-no-env";
const KEY = crypto.createHash("sha256").update(String(keyMaterial)).digest();
const PREFIX = "enc:v1:";

// Criptografa um texto (AES-256-GCM). Retorna "enc:v1:<iv>:<tag>:<dados>" em hex.
export function encrypt(plain) {
  if (plain == null || plain === "") return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + iv.toString("hex") + ":" + tag.toString("hex") + ":" + enc.toString("hex");
}

// Descriptografa. Valores sem o prefixo (legado em texto puro) são retornados como estão.
export function decrypt(value) {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return value;
  try {
    const parts = value.split(":"); // ["enc","v1",iv,tag,dados]
    const iv = Buffer.from(parts[2], "hex");
    const tag = Buffer.from(parts[3], "hex");
    const data = Buffer.from(parts[4], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch (e) {
    return value;
  }
}

// Indica se um valor já está criptografado.
export function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}
