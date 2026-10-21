import { Router } from "express";
import { showItems } from "../controllers/itemsController.js";
import { showDashboard } from "../controllers/dashboardController.js";
import {
  showAuthPage,
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

const router = Router();

// Paginas
router.get("/", showItems);
router.get("/dashboard", showDashboard);
router.get("/regras", showRules);
router.get("/auth", showAuthPage);
router.get("/callback", oauthCallback);

// Acoes
router.post("/auth/code", submitCode);
router.post("/sync", startSync);
router.post("/sync/selection", startSyncSelection);
router.get("/sync/status", syncStatus);
router.post("/settings/zip", saveZipCode);
router.post("/regras", saveRules);
router.get("/export", exportExcel);

export default router;
