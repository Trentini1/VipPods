// Aba Extras: segunda seção de catálogo pequeno cadastrado à mão pelo admin
// (igual a Perfumes, mas em outro caminho do Firebase) — pro dono da loja
// poder manter duas seções manuais ao mesmo tempo, cada uma com nome editável.
const Extras = {
  items: [],
  DEFAULT_LABEL: "Extras",

  async load() {
    try {
      const snap = await firebaseDb.ref("extras").once("value");
      const data = snap.val() || {};
      this.items = Object.entries(data)
        .map(([id, p]) => ({ id, ...p }))
        .filter((p) => p.inStock !== false);
    } catch (err) {
      console.warn("[VIPpods] Não foi possível carregar os extras.", err);
      this.items = [];
    }
    return this.items;
  },

  async loadLabel() {
    try {
      const snap = await firebaseDb.ref("settings/extrasLabel").once("value");
      const label = snap.val();
      return typeof label === "string" && label.trim() ? label.trim() : this.DEFAULT_LABEL;
    } catch (err) {
      console.warn("[VIPpods] Não foi possível carregar o nome da aba.", err);
      return this.DEFAULT_LABEL;
    }
  },
};

(function () {
  const grid = document.getElementById("extra-grid");
  const emptyState = document.getElementById("extra-empty-state");
  if (!grid) return;

  function buildWhatsAppUrl(extra) {
    const message = `Olá! Quero comprar "${extra.name}" - ${UI.formatCurrency(Number(extra.price) || 0)}`;
    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function applyLabel(label) {
    const navLabelEl = document.getElementById("extras-nav-label");
    const titleEl = document.getElementById("extras-title");
    if (navLabelEl) navLabelEl.textContent = label;
    if (titleEl) titleEl.textContent = label;
  }

  function renderCard(extra) {
    const card = document.createElement("article");
    card.className = "perfume-card";
    card.innerHTML = `
      <img class="perfume-card__img" src="${extra.image || "assets/img/placeholder.svg"}" alt="${extra.name}" loading="lazy">
      <div class="perfume-card__body">
        <h3 class="perfume-card__name">${extra.name}</h3>
        ${extra.description ? `<p class="perfume-card__desc">${extra.description}</p>` : ""}
        <div class="perfume-card__footer">
          <span class="perfume-card__price">${UI.formatCurrency(Number(extra.price) || 0)}</span>
          <a class="btn btn--primary perfume-card__buy" href="${buildWhatsAppUrl(extra)}" target="_blank" rel="noopener">Pedir no WhatsApp</a>
        </div>
        <p class="product-card__ship-note">+ taxa de entrega (a combinar)</p>
      </div>
    `;
    return card;
  }

  async function init() {
    const [extras, label] = await Promise.all([Extras.load(), Extras.loadLabel()]);
    applyLabel(label);
    grid.innerHTML = "";
    if (extras.length === 0) {
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (emptyState) emptyState.hidden = true;
    const frag = document.createDocumentFragment();
    extras.forEach((p) => frag.appendChild(renderCard(p)));
    grid.appendChild(frag);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
