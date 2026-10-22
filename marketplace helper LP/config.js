// URL base do sistema Marketplace Helper.
// Local: http://localhost:3333 · Em produção: troque pela URL real do app.
window.APP_URL = "http://localhost:3333";

document.querySelectorAll("[data-app-link]").forEach(function (a) {
  var path = a.getAttribute("href") || "/login";
  a.setAttribute("href", String(window.APP_URL).replace(/\/$/, "") + path);
});
