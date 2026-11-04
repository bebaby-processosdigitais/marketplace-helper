// Persistência da última planilha de estoque enviada, por usuário.
// Guarda o JSON já parseado em uploads/estoque/<userId>.json para que o
// relatório possa ser regerado sem reenviar o arquivo. O botão "Apagar dados"
// remove o arquivo (não ocupa espaço).
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "..", "uploads", "estoque");

const arquivoDoUsuario = (userId) => path.join(DIR, `${userId}.json`);

export async function salvarUpload(userId, dados) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(arquivoDoUsuario(userId), JSON.stringify(dados), "utf8");
}

export async function obterUpload(userId) {
  try {
    const txt = await fs.readFile(arquivoDoUsuario(userId), "utf8");
    return JSON.parse(txt);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

export async function apagarUpload(userId) {
  try {
    await fs.unlink(arquivoDoUsuario(userId));
    return true;
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
}
