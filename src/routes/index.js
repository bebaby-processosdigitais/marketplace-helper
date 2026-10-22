import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  showLogin,
  login,
  showRegister,
  register,
  logout,
} from "../controllers/accountController.js";
import { showItems, saveCusto } from "../controllers/itemsController.js";
import { showDashboard } from "../controllers/dashboardController.js";
import {
  showAuthPage,
  saveMlCredentials,
  submitCode,
  oauthCallback,
} from "../controllers/authController.js";
import {
  startSync,
  startSyncSelection,
  syncStatus,
  saveZipCode,
} from "../controllers/syncController.js";
import { exportExcel } from "../controllers/exportController.js";
import { showRules, saveRules } from "../controllers/rulesController.js";
import { showSimulator, runSimulator } from "../controllers/simulatorController.js";
import { showProducts, saveProductCost } from "../controllers/productController.js";

const router = Router();

// ===== Publicas (sem login) =====
router.get("/login", showLogin);
router.post("/login", login);
router.get("/register", showRegister);
router.post("/register", register);
router.get("/logout", logout);
router.post("/logout", logout);

// ===== Daqui pra baixo exige login =====
router.use(requireAuth);

router.get("/", showItems);
router.get("/dashboard", showDashboard);
router.get("/produtos", showProducts);
router.get("/regras", showRules);
router.get("/simulador", showSimulator);
router.get("/auth", showAuthPage);
router.get("/callback", oauthCallback);

router.post("/auth/credentials", saveMlCredentials);
router.post("/auth/code", submitCode);
router.post("/sync", startSync);
router.post("/sync/selection", startSyncSelection);
router.get("/sync/status", syncStatus);
router.post("/settings/zip", saveZipCode);
router.post("/items/custo", saveCusto);
router.post("/produtos/custo", saveProductCost);
router.post("/regras", saveRules);
router.post("/simulador", runSimulator);
router.get("/export", exportExcel);

export default router;
