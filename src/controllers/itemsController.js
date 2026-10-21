import { listItems } from "../services/itemService.js";
import { getSettings } from "../services/syncService.js";
import { getAuthStatus } from "../services/mlAuth.js";

export async function showItems(req, res) {
  const { page, search, sort, dir } = req.query;
  const data = await listItems({ page, search, sort, dir });
  const settings = await getSettings();
  const status = await getAuthStatus();

  res.render("items", {
    title: "Anuncios",
    ...data,
    zipCode: settings.zipCode,
    authenticated: status.authenticated,
  });
}
