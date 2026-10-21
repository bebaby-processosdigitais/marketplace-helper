import prisma from "../config/prisma.js";

// Converte entrada ("12,5" ou "12.5") para numero; invalido -> 0
function toNum(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// Retorna as regras de negocio (cria a linha unica se nao existir)
export async function getBusinessRules() {
  let r = await prisma.businessRule.findUnique({ where: { id: 1 } });
  if (!r) r = await prisma.businessRule.create({ data: { id: 1 } });
  return r;
}

// Salva/atualiza as regras de negocio
export async function updateBusinessRules({ icms, ipi, difal, custoOperacional }) {
  const data = {
    icms: toNum(icms),
    ipi: toNum(ipi),
    difal: toNum(difal),
    custoOperacional: toNum(custoOperacional),
  };
  return prisma.businessRule.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
}
