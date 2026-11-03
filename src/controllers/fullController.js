import { getFullData } from "../services/fullService.js";
import { getAuthStatus } from "../services/mlAuth.js";

export async function showFull(req, res) {
  const userId = req.user.id;
  const data = await getFullData(userId);
  const status = await getAuthStatus(userId);
  res.render("full", {
    title: "Full",
    ...data,
    authenticated: status.authenticated,
  });
}
