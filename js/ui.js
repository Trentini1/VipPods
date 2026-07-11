// Helpers de UI compartilhados entre Início/Produtos (main.js) e Atacado (wholesale.js):
// normalização de busca, formatação de moeda, card de produto (chassi comum) e
// controles de filtro reutilizáveis (segmented, espectro, rail de chip).
const UI = {
  CATEGORY_OPTIONS: [
    { value: "", label: "Todos" },
    { value: "Descartável", label: "Descartável" },
    { value: "Pod Recarregável", label: "Recarregável" },
    { value: "Refil/Cápsula", label: "Refil" },
    { value: "Acessório", label: "Acessórios" },
  ],

  normalize(text) {
    return (text || "")
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  },

  formatCurrency(value) {
    return value.toLocaleString(CONFIG.CURRENCY_LOCALE, {
      style: "currency",
      currency: CONFIG.CURRENCY,
    });
  },

  // Alterna will-change:transform só durante o toque (nunca fixo), delegado
  // no document pra não precisar religar listener em cada card novo.
  bindPressFx() {
    const SELECTOR =
      ".btn, .product-card, .product-card__add, .qty-btn, .segmented__btn, " +
      ".brand-rail__chip, .cart-item__remove, .spectrum__item";

    const start = (e) => {
      const el = e.target.closest(SELECTOR);
      if (el) el.style.willChange = "transform";
    };
    const end = (e) => {
      const el = e.target.closest(SELECTOR);
      if (el) el.style.willChange = "";
    };

    document.addEventListener("pointerdown", start, { passive: true });
    document.addEventListener("pointerup", end, { passive: true });
    document.addEventListener("pointercancel", end, { passive: true });
  },

  // Segmented control mutuamente exclusivo (sempre tem uma opção "ativa"; não
  // existe estado "nenhuma selecionada" além da opção default, ex: "Todos").
  renderSegmentedControl(container, options, activeValue, onChange) {
    container.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "segmented__btn" + (opt.value === activeValue ? " is-active" : "");
      btn.textContent = opt.label;
      btn.setAttribute("aria-pressed", String(opt.value === activeValue));
      btn.addEventListener("click", () => onChange(opt.value));
      container.appendChild(btn);
    });
  },

  // Rail de chip com toggle: tocar no ativo de novo limpa o filtro.
  renderChipRail(container, values, activeValue, onChange) {
    container.innerHTML = "";
    values.forEach((value) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "brand-rail__chip" + (value === activeValue ? " is-active" : "");
      chip.textContent = value;
      chip.setAttribute("aria-pressed", String(value === activeValue));
      chip.addEventListener("click", () => onChange(value === activeValue ? "" : value));
      container.appendChild(chip);
    });
  },

  // Espectro: swatches de sabor real (não família) com toggle, coloridos pela
  // família de cor do sabor (mesma regra do rail de marca pro toggle).
  renderSpectrum(container, items, activeValue, onChange) {
    container.innerHTML = "";
    items.forEach((item) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "spectrum__item";
      el.dataset.sabor = item.family || item.key;
      el.setAttribute("aria-pressed", String(item.key === activeValue));
      el.innerHTML = `<span class="spectrum__swatch"></span><span class="spectrum__label">${item.label}</span>`;
      el.addEventListener("click", () => onChange(item.key === activeValue ? "" : item.key));
      container.appendChild(el);
    });
  },

  // Cria o "chassi" comum do card (tarja de sabor, imagem, categoria, nome,
  // subtítulo, badge de puffs) e devolve o footer vazio pro chamador colocar
  // o controle específico (botão ⊕ no varejo, stepper no atacado).
  buildProductCardBase(product, { price, priceSuffix = "", eager = false, stockNote = "", stockLow = false } = {}) {
    const family = Flavors.getFamily(product);
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = String(product.id);
    card.dataset.sabor = family;

    const subtitle = [product.brand, product.flavor].filter(Boolean).join(" · ");
    const puffsLabel = product.puffs ? `${product.puffs.toLocaleString("pt-BR")} PUFFS` : "";

    card.innerHTML = `
      <div class="product-card__media">
        <img class="product-card__img" alt="${product.name}"
          ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>
        ${product.featured ? '<span class="product-card__badge">Mais vendido</span>' : ""}
        ${puffsLabel ? `<span class="product-card__puffs">${puffsLabel}</span>` : ""}
      </div>
      <div class="product-card__body">
        <p class="product-card__category">${product.category}</p>
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__subtitle">${subtitle}</p>
        <div class="product-card__footer">
          <span class="product-card__price">${this.formatCurrency(price)}${priceSuffix}</span>
        </div>
        ${stockNote ? `<p class="product-card__stock-note${stockLow ? " product-card__stock-note--low" : ""}">${stockNote}</p>` : ""}
        <p class="product-card__ship-note">+ taxa de entrega (a combinar)</p>
      </div>
    `;

    const img = card.querySelector(".product-card__img");
    img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
    img.src = product.image;
    if (!eager) img.width = 200, (img.height = 200);

    const footer = card.querySelector(".product-card__footer");
    return { card, footer };
  },
};
