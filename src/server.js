import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config/env.js";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Rotas
app.use("/", routes);

// 404
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Nao encontrado",
    message: "Pagina nao encontrada.",
  });
});

// Erros
app.use((err, req, res, next) => {
  console.error("[ERRO]", err);
  res.status(500).render("error", {
    title: "Erro",
    message: err.message || "Erro interno.",
  });
});

app.listen(config.port, () => {
  console.log(`\n  Marketplace Helper rodando em http://localhost:${config.port}\n`);
});
