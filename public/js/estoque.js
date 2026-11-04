// Tabela dinâmica da tela Estoque Full/Cross/Carreta.
// Recebe todas as linhas do cruzamento em JSON e cuida, no cliente, de:
// - filtrar clicando nos KPIs,
// - ordenar clicando nos títulos das colunas (A→Z / Z→A),
// - buscar (SKU, título ou MLB) e paginar.
(function () {
  const el = document.getElementById("estoque-data");
  if (!el) return;
  const DATA = JSON.parse(el.textContent);
  const rows = DATA.rows || [];
  const locais = DATA.locais || [];
  const LIM = DATA.limiar;

  const tbody = document.getElementById("estoque-tbody");
  const info = document.getElementById("estoque-info");
  const pager = document.getElementById("estoque-pager");
  const search = document.getElementById("estoque-search");

  const state = { filter: "all", key: null, dir: 1, q: "", page: 1, size: 50 };

  const FILTERS = {
    all: () => true,
    nao_cadastrado: (r) => !r.cadastrado && r.totalErp > 0,
    baixo103: (r) => r.cadastrado && r.est103 <= LIM,
    baixo103alt: (r) => r.cadastrado && r.est103 <= LIM && r.est101 + r.est201 + r.est203 + r.est204 + r.estoqueFull > 0,
    sem_estoque: (r) => r.cadastrado && r.totalErp === 0,
  };
  const FILTER_LABEL = {
    all: "Todos",
    nao_cadastrado: "Não cadastrados",
    baixo103: "103 baixo",
    baixo103alt: "103 baixo c/ alternativa",
    sem_estoque: "Sem estoque",
  };

  const titulo = (r) => r.titulo || r.produtoErp || "";

  function val(r, key) {
    switch (key) {
      case "titulo": return titulo(r).toLowerCase();
      case "temCatalogo": return r.temCatalogo === true ? 1 : r.temCatalogo === false ? 0 : -1;
      case "estaNoFull": return r.estaNoFull === true ? 1 : r.estaNoFull === false ? 0 : -1;
      case "cadastrado": return r.cadastrado ? 1 : 0;
      case "estoque": return r.estoque == null ? -1 : r.estoque;
      case "sku": { const n = parseInt(r.sku, 10); return isNaN(n) ? r.sku : n; }
      case "status": return (r.status || "").toLowerCase();
      case "sugestao": return (r.sugestao || "").toLowerCase();
      default: return r[key] != null ? r[key] : 0; // est101..est204, estoqueFull
    }
  }
  function cmp(a, b, key, dir) {
    let av = val(a, key), bv = val(b, key);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), "pt-BR") * dir;
  }

  function current() {
    let list = rows.filter(FILTERS[state.filter] || FILTERS.all);
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(
        (r) =>
          String(r.sku).toLowerCase().includes(q) ||
          titulo(r).toLowerCase().includes(q) ||
          String(r.mlbs || "").toLowerCase().includes(q)
      );
    }
    if (state.key) list = list.slice().sort((a, b) => cmp(a, b, state.key, state.dir));
    return list;
  }

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function boolBadge(v) {
    if (v == null) return '<span class="text-muted">—</span>';
    return v ? '<span class="badge text-bg-success">Sim</span>' : '<span class="badge text-bg-light text-muted">Não</span>';
  }
  function sugBadge(s) {
    if (!s) return "";
    let c = "secondary";
    if (s.indexOf("Cadastrar") === 0) c = "dark";
    else if (s.indexOf("Mover") === 0) c = "primary";
    else if (s.indexOf("Carreta") === 0) c = "warning";
    else if (s.indexOf("Full") >= 0) c = "success";
    else if (s.indexOf("Sem estoque") === 0) c = "danger";
    return '<span class="badge text-bg-' + c + '">' + esc(s) + "</span>";
  }

  function rowHtml(r) {
    const loc = locais
      .map((l) => {
        const v = r["est" + l.cod];
        const baixo = l.marketplace && r.cadastrado && v <= LIM;
        return '<td class="text-end ' + (l.marketplace ? "table-warning " : "") + (baixo ? "text-danger fw-bold" : "") + '">' + v + "</td>";
      })
      .join("");
    return (
      "<tr>" +
      "<td><strong>" + esc(r.sku) + "</strong></td>" +
      '<td class="text-truncate" style="max-width:300px;" title="' + esc(titulo(r)) + '">' +
      esc(titulo(r)) + (r.cadastrado ? "" : ' <span class="badge text-bg-dark ms-1">novo</span>') + "</td>" +
      '<td class="text-center">' + boolBadge(r.temCatalogo) + "</td>" +
      '<td class="text-center">' + boolBadge(r.estaNoFull) + "</td>" +
      '<td class="text-end">' + (r.estoque == null ? "—" : r.estoque) + "</td>" +
      '<td class="text-end">' + r.estoqueFull + "</td>" +
      "<td>" + esc(r.status || "—") + "</td>" +
      '<td class="text-center">' +
      (r.cadastrado ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-dash-circle text-muted"></i>') +
      "</td>" +
      loc +
      "<td>" + sugBadge(r.sugestao) + "</td>" +
      "</tr>"
    );
  }

  function render() {
    const list = current();
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / state.size));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * state.size;
    const slice = list.slice(start, start + state.size);

    tbody.innerHTML =
      slice.map(rowHtml).join("") ||
      '<tr><td colspan="' + (9 + locais.length) + '" class="text-center text-muted py-3">Nenhum item para este filtro.</td></tr>';

    info.textContent =
      "mostrando " + (total ? start + 1 : 0) + "–" + Math.min(start + state.size, total) +
      " de " + total + " · filtro: " + (FILTER_LABEL[state.filter] || "Todos");

    renderPager(pages);

    document.querySelectorAll("th[data-key]").forEach((th) => {
      const ic = th.querySelector(".sort-ind");
      if (!ic) return;
      if (th.dataset.key === state.key) ic.className = "sort-ind bi bi-caret-" + (state.dir > 0 ? "up" : "down") + "-fill";
      else ic.className = "sort-ind bi bi-chevron-expand text-muted";
    });
    document.querySelectorAll("[data-filter]").forEach((k) => k.classList.toggle("kpi-active", k.dataset.filter === state.filter));
  }

  function renderPager(pages) {
    if (pages <= 1) { pager.innerHTML = ""; return; }
    const btn = (p, lab, dis, act) =>
      '<li class="page-item ' + (dis ? "disabled" : "") + " " + (act ? "active" : "") + '"><a class="page-link" href="#" data-page="' + p + '">' + lab + "</a></li>";
    let h = btn(state.page - 1, "‹", state.page === 1, false);
    let from = Math.max(1, state.page - 2);
    let to = Math.min(pages, from + 4);
    from = Math.max(1, to - 4);
    if (from > 1) h += btn(1, "1", false, false);
    if (from > 2) h += '<li class="page-item disabled"><span class="page-link">…</span></li>';
    for (let p = from; p <= to; p++) h += btn(p, p, false, p === state.page);
    if (to < pages - 1) h += '<li class="page-item disabled"><span class="page-link">…</span></li>';
    if (to < pages) h += btn(pages, pages, false, false);
    h += btn(state.page + 1, "›", state.page === pages, false);
    pager.innerHTML = h;
  }

  // ---- eventos ----
  document.querySelectorAll("th[data-key]").forEach((th) =>
    th.addEventListener("click", () => {
      const k = th.dataset.key;
      if (state.key === k) state.dir = -state.dir;
      else { state.key = k; state.dir = 1; }
      state.page = 1;
      render();
    })
  );
  document.querySelectorAll("[data-filter]").forEach((k) => {
    const apply = () => {
      const f = k.dataset.filter;
      state.filter = state.filter === f && f !== "all" ? "all" : f;
      state.page = 1;
      render();
    };
    k.addEventListener("click", apply);
    k.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apply(); }
    });
  });
  if (search) search.addEventListener("input", () => { state.q = search.value.trim(); state.page = 1; render(); });
  pager.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    e.preventDefault();
    const p = parseInt(a.dataset.page, 10);
    if (!isNaN(p)) { state.page = p; render(); }
  });

  render();
})();
