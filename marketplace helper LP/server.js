// Servidor estático leve (sem dependências) para a Landing Page.
// Serve os arquivos desta pasta em http://localhost:8080
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.LP_PORT) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

http
  .createServer((req, res) => {
    let rel = decodeURIComponent((req.url || "/").split("?")[0]);
    if (rel === "/") rel = "/index.html";

    const filePath = path.join(__dirname, rel);
    // bloqueia path traversal (sair da pasta)
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        return res.end("<h1>404 - Página não encontrada</h1>");
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`\n  Landing Page rodando em http://localhost:${PORT}\n`);
  });
