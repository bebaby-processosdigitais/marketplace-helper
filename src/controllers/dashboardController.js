import { getDashboardData } from "../services/dashboardService.js";
import { getAuthStatus } from "../services/mlAuth.js";

export async function showDashboard(req, res) {
  const data = await getDashboardData();
  const status = await getAuthStatus();
  res.render("dashboard", {
    title: "Dashboard",
    ...data,
    authenticated: status.authenticated,
  });
}
