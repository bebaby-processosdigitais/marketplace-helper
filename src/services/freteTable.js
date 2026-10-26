// Tabela de custos de envio do Mercado Livre (MercadoLíder / reputação verde /
// sem reputação) — a MESMA usada na Calculadora de Frete (public/js/frete-calc.js).
// Usada no servidor para estimar o "frete real" a partir das medidas do produto.

export const FATOR_CUBAGEM = 6000;

// Diferença mínima (R$) entre frete cobrado e frete real para considerar divergente.
export const LIMIAR_DIVERGENCIA = 2;

// Colunas por faixa de PREÇO do anúncio (max inclusive)
const PRICE_COLS = [18.99, 48.99, 78.99, 99.99, 119.99, 149.99, 199.99, Infinity];

// Linhas por faixa de PESO considerado (max inclusive) + custos por coluna de preço
const WEIGHT_ROWS = [
  { max: 0.3, costs: [5.65, 6.85, 8.15, 12.95, 14.95, 16.95, 19.05, 21.65] },
  { max: 0.5, costs: [5.95, 6.95, 8.25, 13.85, 16.15, 18.15, 20.45, 23.25] },
  { max: 1, costs: [6.05, 7.15, 8.45, 14.45, 16.85, 19.05, 21.35, 24.45] },
  { max: 1.5, costs: [6.15, 7.35, 8.65, 14.75, 17.15, 19.45, 21.75, 25.45] },
  { max: 2, costs: [6.25, 7.45, 8.75, 15.05, 17.65, 19.85, 22.25, 25.55] },
  { max: 3, costs: [6.35, 8.65, 9.15, 16.45, 19.15, 21.65, 24.35, 27.05] },
  { max: 4, costs: [6.45, 8.75, 9.75, 17.85, 20.75, 23.35, 26.35, 29.25] },
  { max: 5, costs: [6.55, 8.85, 10.25, 19.75, 22.85, 26.05, 29.25, 32.45] },
  { max: 6, costs: [6.65, 8.95, 10.35, 25.95, 29.15, 33.35, 36.45, 40.85] },
  { max: 7, costs: [6.75, 9.05, 10.45, 27.55, 31.65, 36.75, 40.85, 45.25] },
  { max: 8, costs: [6.85, 9.25, 10.55, 29.45, 34.35, 39.25, 44.15, 49.35] },
  { max: 9, costs: [6.95, 9.35, 10.65, 30.25, 35.25, 40.35, 45.35, 50.75] },
  { max: 10, costs: [7.05, 9.45, 10.85, 38.25, 45.05, 51.95, 58.75, 65.85] },
  { max: 11, costs: [7.05, 9.65, 11.05, 41.65, 48.55, 55.45, 62.35, 69.35] },
  { max: 13, costs: [7.15, 10.05, 11.45, 42.55, 49.75, 56.85, 63.85, 70.95] },
  { max: 15, costs: [7.25, 10.25, 11.65, 45.55, 52.95, 60.55, 68.15, 75.65] },
  { max: 17, costs: [7.35, 10.45, 11.85, 48.95, 56.55, 64.05, 71.35, 79.35] },
  { max: 20, costs: [7.45, 10.65, 12.05, 55.15, 64.35, 73.55, 82.75, 91.95] },
  { max: 25, costs: [7.65, 11.05, 12.25, 64.55, 75.75, 85.45, 96.25, 106.85] },
  { max: 30, costs: [7.75, 11.25, 12.45, 66.45, 76.05, 86.25, 97.15, 107.85] },
  { max: 40, costs: [7.85, 11.45, 12.65, 68.35, 79.65, 89.75, 100.05, 107.95] },
  { max: 50, costs: [7.95, 11.65, 12.85, 70.95, 81.85, 92.85, 103.45, 111.65] },
  { max: 60, costs: [8.05, 11.85, 13.05, 75.55, 87.25, 99.05, 110.25, 119.05] },
  { max: 70, costs: [8.15, 12.05, 13.25, 80.95, 93.75, 105.95, 118.05, 127.45] },
  { max: 80, costs: [8.25, 12.25, 13.45, 84.65, 97.95, 110.75, 123.35, 133.15] },
  { max: 90, costs: [8.35, 12.45, 13.65, 94.05, 108.35, 122.95, 136.95, 147.85] },
  { max: 100, costs: [8.45, 12.65, 13.85, 107.45, 124.85, 140.45, 156.45, 168.85] },
  { max: 125, costs: [8.55, 12.85, 14.05, 120.15, 138.95, 156.95, 174.85, 188.85] },
  { max: 150, costs: [8.65, 12.85, 14.25, 127.45, 147.05, 166.55, 185.55, 200.35] },
  { max: Infinity, costs: [8.75, 12.85, 14.45, 167.05, 193.35, 218.45, 243.45, 262.85] },
];

function priceColIndex(preco) {
  for (let i = 0; i < PRICE_COLS.length; i++) if (preco <= PRICE_COLS[i]) return i;
  return PRICE_COLS.length - 1;
}
function weightRowIndex(peso) {
  for (let i = 0; i < WEIGHT_ROWS.length; i++) if (peso <= WEIGHT_ROWS[i].max) return i;
  return WEIGHT_ROWS.length - 1;
}

const num = (v) => {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : NaN;
};

// Estima o frete a partir das medidas (cm), peso real (kg) e preço de venda.
// Retorna { cubagem, considerado, usaCubagem, frete } ou null se faltar dado.
export function freteEstimado(largura, altura, comprimento, peso, preco) {
  const l = num(largura), a = num(altura), c = num(comprimento);
  const p = num(peso), pr = num(preco);
  if (!(l > 0 && a > 0 && c > 0 && p > 0) || !(pr >= 0)) return null;

  const cubagem = (l * a * c) / FATOR_CUBAGEM;
  const considerado = Math.max(p, cubagem);
  const frete = WEIGHT_ROWS[weightRowIndex(considerado)].costs[priceColIndex(pr)];
  return { cubagem, considerado, usaCubagem: cubagem > p, frete };
}

// Avalia a divergência de frete de um anúncio (precisa de medidas + frete cobrado).
// Usa precoPor (se houver) senão precoDe para escolher a coluna de preço.
export function avaliaDivergencia(item) {
  const base = item.precoPor && item.precoPor > 0 ? item.precoPor : item.precoDe || 0;
  const est = freteEstimado(item.largura, item.altura, item.comprimento, item.pesoReal, base);
  const temMedidas = est != null;
  const cobrado = item.frete;
  if (!temMedidas || cobrado == null) {
    return { temMedidas, temCobrado: cobrado != null, freteReal: est ? est.frete : null, freteCobrado: cobrado ?? null, delta: null, divergente: false };
  }
  const delta = est.frete - cobrado; // >0: real maior que o cobrado (subdeclarado)
  return {
    temMedidas: true,
    temCobrado: true,
    freteReal: est.frete,
    freteCobrado: cobrado,
    cubagem: est.cubagem,
    considerado: est.considerado,
    delta,
    divergente: Math.abs(delta) >= LIMIAR_DIVERGENCIA,
  };
}
