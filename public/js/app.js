// Controle dos botoes de sync (tudo / selecao), selecao de linhas
// e acompanhamento do progresso.
(function () {
  const btn = document.getElementById("btnSync");
  const btnSel = document.getElementById("btnSyncSel");
  if (!btn && !btnSel) return;

  const box = document.getElementById("syncBox");
  const phaseEl = document.getElementById("syncPhase");
  const countsEl = document.getElementById("syncCounts");
  const bar = document.getElementById("syncBar");

  let polling = null;

  function setButtonsDisabled(disabled) {
    if (btn) btn.disabled = disabled;
    if (btnSel) btnSel.disabled = disabled;
  }

  function resetButtons() {
    setButtonsDisabled(false);
    if (btn) btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Atualizar tudo';
    if (btnSel) {
      const n = selectedCount();
      btnSel.innerHTML =
        '<i class="bi bi-check2-square"></i> Atualizar seleção (<span id="selCount">' + n + "</span>)";
    }
  }

  function render(state) {
    box.classList.remove("d-none");
    const escopo = state.escopo === "selecao" ? " (seleção)" : "";
    phaseEl.textContent = "Sincronizando" + escopo + ": " + (state.phase || "...");
    const done = state.processed || 0;
    const total = state.totalIds || 0;
    countsEl.textContent =
      `${done}/${total} · novos: ${state.novos} · atualizados: ${state.atualizados} · fretes mudaram: ${state.fretesMudaram}`;

    const pct = total > 0 ? Math.round((done / total) * 100) : (state.running ? 15 : 100);
    bar.style.width = pct + "%";

    if (!state.running) {
      clearInterval(polling);
      resetButtons();

      if (state.error) {
        box.className = "alert alert-danger";
        phaseEl.textContent = "Erro: " + state.error;
      } else {
        box.className = "alert alert-success";
        phaseEl.textContent = "Concluído!";
        bar.classList.remove("progress-bar-animated");
        setTimeout(() => window.location.reload(), 1200);
      }
    }
  }

  async function poll() {
    try {
      const res = await fetch("/sync/status");
      const state = await res.json();
      render(state);
    } catch (e) {
      /* ignora falhas transitorias de polling */
    }
  }

  // Dispara um sync (url = /sync ou /sync/selection)
  async function startSync(url, body, clickedBtn) {
    setButtonsDisabled(true);
    if (clickedBtn) {
      clickedBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Sincronizando...';
    }
    box.className = "alert alert-info";
    box.classList.remove("d-none");
    phaseEl.textContent = "Iniciando...";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao iniciar sync.");
      }
      polling = setInterval(poll, 1500);
      poll();
    } catch (e) {
      box.className = "alert alert-danger";
      phaseEl.textContent = e.message;
      resetButtons();
    }
  }

  if (btn) {
    btn.addEventListener("click", () => startSync("/sync", null, btn));
  }

  // ============ Selecao de linhas ============
  const checkAll = document.getElementById("checkAll");
  const rowChecks = () => Array.from(document.querySelectorAll(".row-check"));

  function selectedMlbs() {
    return rowChecks().filter((c) => c.checked).map((c) => c.value);
  }
  function selectedCount() {
    return selectedMlbs().length;
  }

  function updateSelectionUI() {
    const n = selectedCount();
    const span = document.getElementById("selCount");
    if (span) span.textContent = n;
    if (btnSel) btnSel.classList.toggle("d-none", n === 0);

    // estado do "selecionar todos"
    if (checkAll) {
      const all = rowChecks();
      checkAll.checked = all.length > 0 && n === all.length;
      checkAll.indeterminate = n > 0 && n < all.length;
    }
  }

  if (checkAll) {
    checkAll.addEventListener("change", () => {
      rowChecks().forEach((c) => (c.checked = checkAll.checked));
      updateSelectionUI();
    });
  }

  rowChecks().forEach((c) =>
    c.addEventListener("change", updateSelectionUI)
  );

  if (btnSel) {
    btnSel.addEventListener("click", () => {
      const mlbs = selectedMlbs();
      if (mlbs.length === 0) return;
      startSync("/sync/selection", { mlbs }, btnSel);
    });
  }

  updateSelectionUI();
})();
