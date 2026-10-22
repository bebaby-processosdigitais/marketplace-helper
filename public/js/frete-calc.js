// Calculadora de Frete do Mercado Livre
// Tabela: MercadoLíder / reputação verde / sem reputação (já inclui o desconto de reputação).
// Produtos novos, enviados por Full, Coleta e Agências. Valores em R$.

// Fator de cubagem padrão do Mercado Livre (cm³ -> kg)
var FATOR_CUBAGEM = 6000;

// Colunas por faixa de PREÇO do anúncio (max inclusive)
var PRICE_COLS = [
  { max: 18.99, label: "R$ 0 a R$ 18,99" },
  { max: 48.99, label: "R$ 19 a R$ 48,99" },
  { max: 78.99, label: "R$ 49 a R$ 78,99" },
  { max: 99.99, label: "R$ 79 a R$ 99,99" },
  { max: 119.99, label: "R$ 100 a R$ 119,99" },
  { max: 149.99, label: "R$ 120 a R$ 149,99" },
  { max: 199.99, label: "R$ 150 a R$ 199,99" },
  { max: Infinity, label: "A partir de R$ 200" },
];

// Linhas por faixa de PESO considerado (max inclusive) + custos por coluna de preço
var WEIGHT_ROWS = [
  { max: 0.3, label: "Até 0,3 kg", costs: [5.65, 6.85, 8.15, 12.95, 14.95, 16.95, 19.05, 21.65] },
  { max: 0.5, label: "0,3 a 0,5 kg", costs: [5.95, 6.95, 8.25, 13.85, 16.15, 18.15, 20.45, 23.25] },
  { max: 1, label: "0,5 a 1 kg", costs: [6.05, 7.15, 8.45, 14.45, 16.85, 19.05, 21.35, 24.45] },
  { max: 1.5, label: "1 a 1,5 kg", costs: [6.15, 7.35, 8.65, 14.75, 17.15, 19.45, 21.75, 25.45] },
  { max: 2, label: "1,5 a 2 kg", costs: [6.25, 7.45, 8.75, 15.05, 17.65, 19.85, 22.25, 25.55] },
  { max: 3, label: "2 a 3 kg", costs: [6.35, 8.65, 9.15, 16.45, 19.15, 21.65, 24.35, 27.05] },
  { max: 4, label: "3 a 4 kg", costs: [6.45, 8.75, 9.75, 17.85, 20.75, 23.35, 26.35, 29.25] },
  { max: 5, label: "4 a 5 kg", costs: [6.55, 8.85, 10.25, 19.75, 22.85, 26.05, 29.25, 32.45] },
  { max: 6, label: "5 a 6 kg", costs: [6.65, 8.95, 10.35, 25.95, 29.15, 33.35, 36.45, 40.85] },
  { max: 7, label: "6 a 7 kg", costs: [6.75, 9.05, 10.45, 27.55, 31.65, 36.75, 40.85, 45.25] },
  { max: 8, label: "7 a 8 kg", costs: [6.85, 9.25, 10.55, 29.45, 34.35, 39.25, 44.15, 49.35] },
  { max: 9, label: "8 a 9 kg", costs: [6.95, 9.35, 10.65, 30.25, 35.25, 40.35, 45.35, 50.75] },
  { max: 10, label: "9 a 10 kg", costs: [7.05, 9.45, 10.85, 38.25, 45.05, 51.95, 58.75, 65.85] },
  { max: 11, label: "10 a 11 kg", costs: [7.05, 9.65, 11.05, 41.65, 48.55, 55.45, 62.35, 69.35] },
  { max: 13, label: "11 a 13 kg", costs: [7.15, 10.05, 11.45, 42.55, 49.75, 56.85, 63.85, 70.95] },
  { max: 15, label: "13 a 15 kg", costs: [7.25, 10.25, 11.65, 45.55, 52.95, 60.55, 68.15, 75.65] },
  { max: 17, label: "15 a 17 kg", costs: [7.35, 10.45, 11.85, 48.95, 56.55, 64.05, 71.35, 79.35] },
  { max: 20, label: "17 a 20 kg", costs: [7.45, 10.65, 12.05, 55.15, 64.35, 73.55, 82.75, 91.95] },
  { max: 25, label: "20 a 25 kg", costs: [7.65, 11.05, 12.25, 64.55, 75.75, 85.45, 96.25, 106.85] },
  { max: 30, label: "25 a 30 kg", costs: [7.75, 11.25, 12.45, 66.45, 76.05, 86.25, 97.15, 107.85] },
  { max: 40, label: "30 a 40 kg", costs: [7.85, 11.45, 12.65, 68.35, 79.65, 89.75, 100.05, 107.95] },
  { max: 50, label: "40 a 50 kg", costs: [7.95, 11.65, 12.85, 70.95, 81.85, 92.85, 103.45, 111.65] },
  { max: 60, label: "50 a 60 kg", costs: [8.05, 11.85, 13.05, 75.55, 87.25, 99.05, 110.25, 119.05] },
  { max: 70, label: "60 a 70 kg", costs: [8.15, 12.05, 13.25, 80.95, 93.75, 105.95, 118.05, 127.45] },
  { max: 80, label: "70 a 80 kg", costs: [8.25, 12.25, 13.45, 84.65, 97.95, 110.75, 123.35, 133.15] },
  { max: 90, label: "80 a 90 kg", costs: [8.35, 12.45, 13.65, 94.05, 108.35, 122.95, 136.95, 147.85] },
  { max: 100, label: "90 a 100 kg", costs: [8.45, 12.65, 13.85, 107.45, 124.85, 140.45, 156.45, 168.85] },
  { max: 125, label: "100 a 125 kg", costs: [8.55, 12.85, 14.05, 120.15, 138.95, 156.95, 174.85, 188.85] },
  { max: 150, label: "125 a 150 kg", costs: [8.65, 12.85, 14.25, 127.45, 147.05, 166.55, 185.55, 200.35] },
  { max: Infinity, label: "Mais de 150 kg", costs: [8.75, 12.85, 14.45, 167.05, 193.35, 218.45, 243.45, 262.85] },
];

(function () {
  function num(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    return parseFloat(String(el.value).replace(",", "."));
  }
  function brl(v) {
    return "R$ " + v.toFixed(2).replace(".", ",");
  }
  function priceColIndex(preco) {
    for (var i = 0; i < PRICE_COLS.length; i++) if (preco <= PRICE_COLS[i].max) return i;
    return PRICE_COLS.length - 1;
  }
  function weightRowIndex(peso) {
    for (var i = 0; i < WEIGHT_ROWS.length; i++) if (peso <= WEIGHT_ROWS[i].max) return i;
    return WEIGHT_ROWS.length - 1;
  }

  var resultBox = document.getElementById("fc-result");
  var hintBox = document.getElementById("fc-hint");

  function calc() {
    var l = num("fc-largura"), a = num("fc-altura"), c = num("fc-comprimento");
    var peso = num("fc-peso"), preco = num("fc-preco");

    var okDim = l > 0 && a > 0 && c > 0 && peso > 0;
    var okPreco = preco >= 0 && !isNaN(preco);

    if (!okDim || !okPreco) {
      resultBox.classList.add("d-none");
      if (hintBox) hintBox.classList.remove("d-none");
      return;
    }
    if (hintBox) hintBox.classList.add("d-none");

    var cubagem = (l * a * c) / FATOR_CUBAGEM; // kg
    var usaCubagem = cubagem > peso;
    var considerado = Math.max(peso, cubagem);

    var ci = priceColIndex(preco);
    var ri = weightRowIndex(considerado);
    var custo = WEIGHT_ROWS[ri].costs[ci];

    document.getElementById("fc-cubagem").textContent = cubagem.toFixed(3).replace(".", ",") + " kg";
    document.getElementById("fc-peso-real").textContent = peso.toFixed(3).replace(".", ",") + " kg";
    document.getElementById("fc-considerado").textContent = considerado.toFixed(3).replace(".", ",") + " kg";
    document.getElementById("fc-qual").textContent = usaCubagem ? "cubagem (maior)" : "peso real (maior)";
    document.getElementById("fc-qual").className = "badge " + (usaCubagem ? "text-bg-warning" : "text-bg-success");
    document.getElementById("fc-faixa-peso").textContent = WEIGHT_ROWS[ri].label;
    document.getElementById("fc-faixa-preco").textContent = PRICE_COLS[ci].label;
    document.getElementById("fc-custo").textContent = brl(custo);

    resultBox.classList.remove("d-none");
    highlightTable(ri, ci);
  }

  // Monta a tabela de referência e destaca a célula correspondente
  var tableBuilt = false;
  function buildTable() {
    var thead = document.getElementById("fc-tabela-head");
    var tbody = document.getElementById("fc-tabela-body");
    if (!thead || !tbody) return;
    var h = "<tr><th>Peso</th>";
    PRICE_COLS.forEach(function (p) { h += "<th class='text-end'>" + p.label + "</th>"; });
    h += "</tr>";
    thead.innerHTML = h;
    var b = "";
    WEIGHT_ROWS.forEach(function (row, ri) {
      b += "<tr data-row='" + ri + "'><td class='text-nowrap'>" + row.label + "</td>";
      row.costs.forEach(function (c, ci) {
        b += "<td class='text-end' data-cell='" + ri + "-" + ci + "'>" + brl(c) + "</td>";
      });
      b += "</tr>";
    });
    tbody.innerHTML = b;
    tableBuilt = true;
  }
  function highlightTable(ri, ci) {
    if (!tableBuilt) return;
    document.querySelectorAll(".fc-hit").forEach(function (el) { el.classList.remove("fc-hit"); });
    var cell = document.querySelector("[data-cell='" + ri + "-" + ci + "']");
    if (cell) cell.classList.add("fc-hit");
  }

  ["fc-largura", "fc-altura", "fc-comprimento", "fc-peso", "fc-preco"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", calc);
  });

  buildTable(); // monta a tabela de referência uma vez
})();
