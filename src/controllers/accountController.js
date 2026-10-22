import {
  createUser,
  findByEmail,
  verifyPassword,
  validatePassword,
  updateProfile,
  changePassword,
} from "../services/accountService.js";
import { getAuthStatus } from "../services/mlAuth.js";
import { getMlProfile } from "../services/mlApi.js";

export function showLogin(req, res) {
  if (req.session?.userId) return res.redirect("/");
  res.render("login", {
    title: "Entrar",
    error: req.query.error || null,
    message: req.query.message || null,
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await findByEmail(email);
  if (!user || !(await verifyPassword(user, password))) {
    return res.redirect("/login?error=" + encodeURIComponent("E-mail ou senha inválidos."));
  }
  req.session.userId = user.id;
  res.redirect("/");
}

export function showRegister(req, res) {
  if (req.session?.userId) return res.redirect("/");
  res.render("register", { title: "Criar conta", error: null, values: {} });
}

export async function register(req, res) {
  const { email, storeName, whatsapp, password, confirmPassword } = req.body;
  const values = { email, storeName, whatsapp };
  const fail = (error) =>
    res.status(400).render("register", { title: "Criar conta", error, values });

  if (!email || !storeName || !whatsapp || !password) return fail("Preencha todos os campos.");
  if (password !== confirmPassword) return fail("As senhas não conferem.");

  const pwError = validatePassword(password);
  if (pwError) return fail(pwError);

  if (await findByEmail(email)) return fail("Esse e-mail já está cadastrado.");

  try {
    const user = await createUser({ email, storeName, whatsapp, password });
    req.session.userId = user.id;
    res.redirect("/");
  } catch (e) {
    fail("Não foi possível criar a conta. Tente novamente.");
  }
}

export function logout(req, res) {
  req.session = null;
  res.redirect("/login?message=" + encodeURIComponent("Você saiu da conta."));
}

// ===== Minha conta =====
export async function showAccount(req, res) {
  const status = await getAuthStatus(req.user.id);
  let mlProfile = null;
  if (status.authenticated) {
    try {
      mlProfile = await getMlProfile(req.user.id);
    } catch (_) {
      mlProfile = null;
    }
  }
  res.render("account", {
    title: "Minha Conta",
    message: req.query.message || null,
    error: req.query.error || null,
    authenticated: status.authenticated,
    mlProfile,
  });
}

export async function updateAccountProfile(req, res) {
  const { storeName, email, whatsapp } = req.body;
  if (!storeName || !email || !whatsapp) {
    return res.redirect("/conta?error=" + encodeURIComponent("Preencha nome da loja, e-mail e WhatsApp."));
  }
  const existing = await findByEmail(email);
  if (existing && existing.id !== req.user.id) {
    return res.redirect("/conta?error=" + encodeURIComponent("Esse e-mail já está em uso por outra conta."));
  }
  try {
    await updateProfile(req.user.id, { storeName, email, whatsapp });
    res.redirect("/conta?message=" + encodeURIComponent("Dados atualizados com sucesso!"));
  } catch (e) {
    res.redirect("/conta?error=" + encodeURIComponent("Não foi possível salvar."));
  }
}

export async function updateAccountPassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!(await verifyPassword(req.user, currentPassword))) {
    return res.redirect("/conta?error=" + encodeURIComponent("Senha atual incorreta."));
  }
  if (newPassword !== confirmPassword) {
    return res.redirect("/conta?error=" + encodeURIComponent("A nova senha e a confirmação não conferem."));
  }
  const pwError = validatePassword(newPassword);
  if (pwError) {
    return res.redirect("/conta?error=" + encodeURIComponent(pwError));
  }
  await changePassword(req.user.id, newPassword);
  res.redirect("/conta?message=" + encodeURIComponent("Senha alterada com sucesso!"));
}

// ===== Recuperação de senha (placeholder — envio por e-mail ainda não configurado) =====
export function showForgot(req, res) {
  if (req.session?.userId) return res.redirect("/");
  res.render("forgot", { title: "Recuperar senha", sent: false, email: "" });
}

export function submitForgot(req, res) {
  res.render("forgot", { title: "Recuperar senha", sent: true, email: req.body.email || "" });
}
