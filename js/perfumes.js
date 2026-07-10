// Aba Perfumes: catálogo pequeno cadastrado à mão pelo admin (sem tabela de
// 500+ produtos como os pods) — lista simples com foto, descrição e preço,
// lida direto do Firebase (mesmo caminho "perfumes" que o admin escreve).
const Perfumes = {
  items: [],

  async load() {
    try {
      const snap = await firebaseDb.ref("perfumes").once("value");
      const data = snap.val() || {};
      this.items = Object.entries(data)
        .map(([id, p]) => ({ id, ...p }))
        .filter((p) => p.inStock !== false);
    } catch (err) {
      console.warn("[VIPpods] Não foi possível carregar os perfumes.", err);
      this.items = [];
    }
    return this.items;
  },
};

(function () {
  const grid = document.getElementById("perfume-grid");
  const emptyState = document.getElementById("perfume-empty-state");
  if (!grid) return;

  function buildWhatsAppUrl(perfume) {
    const message = `Olá! Quero comprar o perfume "${perfume.name}" - ${UI.formatCurrency(Number(perfume.price) || 0)}`;
    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function renderCard(perfume) {
    const card = document.createElement("article");
    card.className = "perfume-card";
    card.innerHTML = `
      <img class="perfume-card__img" src="${perfume.image || "assets/img/placeholder.svg"}" alt="${perfume.name}" loading="lazy">
      <div class="perfume-card__body">
        <h3 class="perfume-card__name">${perfume.name}</h3>
        ${perfume.description ? `<p class="perfume-card__desc">${perfume.description}</p>` : ""}
        <div class="perfume-card__footer">
          <span class="perfume-card__price">${UI.formatCurrency(Number(perfume.price) || 0)}</span>
          <a class="btn btn--primary perfume-card__buy" href="${buildWhatsAppUrl(perfume)}" target="_blank" rel="noopener">Pedir no WhatsApp</a>
        </div>
        <p class="product-card__ship-note">+ taxa de entrega (a combinar)</p>
      </div>
    `;
    return card;
  }

  async function init() {
    const perfumes = await Perfumes.load();
    grid.innerHTML = "";
    if (perfumes.length === 0) {
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (emptyState) emptyState.hidden = true;
    const frag = document.createDocumentFragment();
    perfumes.forEach((p) => frag.appendChild(renderCard(p)));
    grid.appendChild(frag);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
