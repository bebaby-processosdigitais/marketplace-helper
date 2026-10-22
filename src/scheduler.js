import cron from "node-cron";
import prisma from "./config/prisma.js";
import { runSync } from "./services/syncService.js";

// Sincroniza os anúncios de todos os usuários que já autorizaram o ML.
async function syncAllUsers() {
  const accounts = await prisma.mlAccount.findMany({
    where: { accessToken: { not: null } },
    select: { userId: true },
  });
  console.log(`[CRON] Sincronizando ${accounts.length} conta(s)...`);
  for (const a of accounts) {
    try {
      await runSync(a.userId); // roda em background (não bloqueia)
    } catch (e) {
      console.error(`[CRON] erro no usuário ${a.userId}:`, e.message);
    }
  }
}

// Agenda a sincronização para meia-noite (00:00) e meio-dia (12:00).
export function startScheduler() {
  cron.schedule("0 0,12 * * *", () => {
    console.log("[CRON] Disparo agendado (" + new Date().toLocaleString("pt-BR") + ")");
    syncAllUsers();
  });
  console.log("  Sincronização automática agendada para 00:00 e 12:00.");
}
