import {
  createUser,
  findByEmail,
  verifyPassword,
  validatePassword,
} from "../services/accountService.js";

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
  const { email, storeName, password, confirmPassword } = req.body;
  const values = { email, storeName };
  const fail = (error) =>
    res.status(400).render("register", { title: "Criar conta", error, values });

  if (!email || !storeName || !password) return fail("Preencha todos os campos.");
  if (password !== confirmPassword) return fail("As senhas não conferem.");

  const pwError = validatePassword(password);
  if (pwError) return fail(pwError);

  if (await findByEmail(email)) return fail("Esse e-mail já está cadastrado.");

  try {
    const user = await createUser({ email, storeName, password });
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
