// Simulação do fluxo de medição (câmera + balança Bluetooth) da página /medir.
(function () {
  const $ = (id) => document.getElementById(id);
  const btnMedir = $("btnMedir");
  if (!btnMedir) return;

  const btnBalanca = $("btnBalanca");
  const btnSalvar = $("btnSalvarMedicao");

  const rnd = (a, b, dec = 0) => {
    const v = a + Math.random() * (b - a);
    return dec ? +v.toFixed(dec) : Math.round(v);
  };
  const brl = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");
  const numv = (id) => parseFloat(String($(id).value).replace(",", "."));
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

  // --- Câmera: mede L/A/C ---
  btnMedir.addEventListener("click", function () {
    const scanner = $("medScanner");
    const status = $("medScanStatus");
    scanner.classList.remove("done");
    scanner.classList.add("scanning");
    status.textContent = "Medindo…";
    btnMedir.disabled = true;
    setTimeout(function () {
      $("medL").value = rnd(10, 40);
      $("medA").value = rnd(5, 30);
      $("medC").value = rnd(12, 50);
      scanner.classList.remove("scanning");
      scanner.classList.add("done");
      status.textContent = "Dimensões capturadas";
      btnMedir.disabled = false;
    }, 1800);
  });

  // --- Balança: recebe o peso ---
  btnBalanca.addEventListener("click", function () {
    const scale = $("medScale");
    const status = $("medScaleStatus");
    const valEl = $("medScaleValue");
    scale.classList.remove("done");
    scale.classList.add("scanning");
    status.textContent = "Conectando à balança…";
    valEl.textContent = "…";
    btnBalanca.disabled = true;
    setTimeout(function () {
      const peso = rnd(0.2, 5, 2);
      const txt = String(peso).replace(".", ",");
      $("medPeso").value = txt;
      valEl.textContent = txt + " kg";
      scale.classList.remove("scanning");
      scale.classList.add("done");
      status.textContent = "Peso recebido";
      btnBalanca.disabled = false;
    }, 1500);
  });

  // --- Salvar + comparar ---
  btnSalvar.addEventListener("click", async function () {
    const sku = $("medSku").value.trim();
    if (!sku) { alert("Informe o SKU do produto."); return; }
    if (!(numv("medL") > 0 && numv("medA") > 0 && numv("medC") > 0 && numv("medPeso") > 0)) {
      alert("Preencha as dimensões e o peso (meça ou digite).");
      return;
    }
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando…';
    try {
      const r = await fetch("/produtos/medidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          largura: $("medL").value,
          altura: $("medA").value,
          comprimento: $("medC").value,
          pesoReal: $("medPeso").value,
        }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "falha");
      renderResult(data, sku);
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = '<i class="bi bi-check2-circle"></i> Calcular e salvar';
    }
  });

  function kpi(label, val) {
    return '<div class="col"><div class="kpi-label">' + label + "</div><div class=\"fw-bold fs-5\">" + val + "</div></div>";
  }

  function renderResult(data, sku) {
    const res = $("medResult");
    const body = $("medResultBody");
    const l = numv("medL"), a = numv("medA"), c = numv("medC"), p = numv("medPeso");
    const cub = (l * a * c) / 6000;
    const cons = Math.max(p, cub);

    let html = '<div class="fw-semibold mb-2"><i class="bi bi-rulers text-primary"></i> Resultado — SKU ' + esc(sku) + "</div>";
    html += '<div class="row text-center g-2 mb-2">';
    html += kpi("Cubagem", cub.toFixed(3).replace(".", ",") + " kg");
    html += kpi("Peso considerado", cons.toFixed(3).replace(".", ",") + " kg");
    html += "</div>";

    const cmp = data.comparacao;
    if (data.afetados === 0) {
      html += '<div class="alert alert-warning mb-0"><i class="bi bi-exclamation-triangle"></i> Nenhum anúncio com o SKU <strong>' + esc(sku) + "</strong>. As medidas não foram vinculadas — escolha um SKU existente.</div>";
    } else if (!cmp || cmp.freteCobrado == null) {
      html += '<div class="alert alert-secondary mb-0">Medidas salvas em <strong>' + data.afetados + "</strong> anúncio(s). Ainda sem frete cobrado para comparar (rode um <strong>Atualizar</strong> em Anúncios).</div>";
    } else {
      const delta = cmp.delta;
      html += '<div class="row text-center g-2">';
      html += kpi("Frete cobrado", brl(cmp.freteCobrado));
      html += kpi("Frete real", brl(cmp.freteReal));
      html += "</div>";
      html += '<div class="text-center mt-3">';
      if (cmp.divergente) {
        const dir = delta > 0 ? "acima" : "abaixo";
        html += '<span class="badge text-bg-danger fs-6"><i class="bi bi-exclamation-triangle"></i> Frete divergente — real ' + dir + " do cobrado em " + brl(Math.abs(delta)) + "</span>";
      } else {
        html += '<span class="badge text-bg-success fs-6"><i class="bi bi-check-circle"></i> Frete coerente (Δ ' + brl(Math.abs(delta)) + ")</span>";
      }
      html += "</div>";
      html += '<p class="text-muted small text-center mt-2 mb-0">Aplicado a ' + data.afetados + ' anúncio(s) do SKU. Veja todos em <a href="/produtos">Produtos</a>.</p>';
    }
    body.innerHTML = html;
    res.classList.remove("d-none");
    res.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
})();
