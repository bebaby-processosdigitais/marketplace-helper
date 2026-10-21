import dotenv from "dotenv";
dotenv.config();

export const config = {
  appId: process.env.ML_APP_ID,
  appSecret: process.env.ML_APP_SECRET,
  redirectUri: process.env.ML_REDIRECT_URI,
  port: Number(process.env.PORT) || 3333,
};

if (!config.appId || !config.appSecret || !config.redirectUri) {
  console.warn(
    "[AVISO] Credenciais do ML incompletas. Confira ML_APP_ID, ML_APP_SECRET e ML_REDIRECT_URI no .env"
  );
}
