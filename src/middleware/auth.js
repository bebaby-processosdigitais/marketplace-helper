import { getUserById } from "../services/accountService.js";

// Exige login. Carrega o usuario em req.user e res.locals.user (para as views).
export async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login");
  }
  const user = await getUserById(req.session.userId);
  if (!user) {
    req.session = null;
    return res.redirect("/login");
  }
  req.user = user;
  res.locals.user = user;
  next();
}
