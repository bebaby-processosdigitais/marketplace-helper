import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";

// Valida a senha: minimo 8 caracteres, 1 maiuscula e 1 numero.
// Retorna mensagem de erro ou null se OK.
export function validatePassword(pw) {
  if (!pw || pw.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(pw)) return "A senha deve ter pelo menos uma letra maiúscula.";
  if (!/[0-9]/.test(pw)) return "A senha deve ter pelo menos um número.";
  return null;
}

export async function createUser({ email, storeName, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      storeName: storeName.trim(),
      passwordHash,
    },
  });
}

export async function findByEmail(email) {
  if (!email) return null;
  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function getUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function verifyPassword(user, password) {
  if (!user || !password) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function updateProfile(userId, { storeName, email }) {
  return prisma.user.update({
    where: { id: userId },
    data: { storeName: storeName.trim(), email: email.toLowerCase().trim() },
  });
}

export async function changePassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
