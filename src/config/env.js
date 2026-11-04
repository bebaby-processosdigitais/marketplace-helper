import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Em produção, os segredos precisam vir do ambiente: sem eles, o app usaria
// valores padrão públicos (cookies forjáveis e tokens do ML decifráveis).
if (isProduction) {
  const missing = ["SESSION_SECRET", "ENCRYPTION_KEY"].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Variáveis de ambiente obrigatórias em produção ausentes: ${missing.join(", ")}.`
    );
  }
}

export const config = {
  isProduction,
  port: Number(process.env.PORT) || 3333,
  // Fuso usado pelo agendamento (cron). Servidores em nuvem costumam rodar em UTC.
  timezone: process.env.TZ || "America/Sao_Paulo",
  sessionSecret:
    process.env.SESSION_SECRET || "troque-este-segredo-no-env-por-um-aleatorio",
  // Segredo dos tokens JWT da API (cai no SESSION_SECRET se não definido).
  jwtSecret:
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    "troque-este-segredo-no-env-por-um-aleatorio",
};
