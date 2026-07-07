// Carrinho e catálogo da aba Atacado/Revendedor. Preços usam product.wholesalePrice
// e o pedido só libera o checkout quando o total de unidades bate o mínimo (CONFIG.WHOLESALE_MIN_QTY).
const WholesaleCart = {
  STORAGE_KEY: "vippods_wholesale_cart",
  items: {}, // { [productId]: quantidade }

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.items = raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn("[VIPpods] Carrinho de atacado salvo estava corrompido, iniciando vazio.", err);
      this.items = {};
    }
  },

  persist() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    } catch (err) {
      console.warn("[VIPpods] Não foi possível salvar o carrinho de atacado no localStorage.", err);
    }
  },

  setQty(productId, newQty) {
    const qty = Math.max(0, Math.floor(newQty) || 0);
    if (qty === 0) {
      delete this.items[productId];
    } else {
      this.items[productId] = qty;
    }
    this.persist();
    this.renderSummary();
  },

  getQty(productId) {
    return this.items[productId] || 0;
  },

  getEntries() {
    return Object.entries(this.items)
      .map(([id, qty]) => {
        const product = Products.getById(Number(id));
        return product ? { product, qty } : null;
      })
      .filter(Boolean);
  },

  getTotalQty() {
    return Object.values(this.items).reduce((sum, qty) => sum + qty, 0);
  },

  getTotalValue() {
    return this.getEntries().reduce((sum, { product, qty }) => sum + product.wholesalePrice * qty, 0);
  },

  formatCurrency(value) {
    return value.toLocaleString(CONFIG.CURRENCY_LOCALE, {
      style: "currency",
      currency: CONFIG.CURRENCY,
    });
  },

  renderSummary() {
    const totalQtyEl = document.getElementById("wholesale-total-qty");
    const totalValueEl = document.getElementById("wholesale-total-value");
    const warningEl = document.getElementById("wholesale-min-warning");
    const checkoutBtn = document.getElementById("wholesale-checkout-btn");
    if (!totalQtyEl) return;

    const totalQty = this.getTotalQty();
    const totalValue = this.getTotalValue();
    const minQty = CONFIG.WHOLESALE_MIN_QTY;

    totalQtyEl.textContent = String(totalQty);
    totalValueEl.textContent = this.formatCurrency(totalValue);

    if (totalQty > 0 && totalQty < minQty) {
      warningEl.hidden = false;
      warningEl.textContent = `Faltam ${minQty - totalQty} unidades para o mínimo de ${minQty}.`;
    } else {
      warningEl.hidden = true;
    }

    checkoutBtn.disabled = totalQty < minQty;
  },

  buildWhatsAppMessage() {
    const entries = this.getEntries();
    const total = this.getTotalValue();

    const lines = [`Olá! Quero fazer um pedido no atacado/revenda na ${CONFIG.STORE_NAME}:`, ""];
    entries.forEach(({ product, qty }) => {
      lines.push(`• ${qty}x ${product.name} - ${this.formatCurrency(product.wholesalePrice * qty)}`);
    });
    lines.push("");
    lines.push(`Total de unidades: ${this.getTotalQty()}`);
    lines.push(`Total do pedido: ${this.formatCurrency(total)}`);

    return lines.join("\n");
  },

  checkout() {
    if (this.getTotalQty() < CONFIG.WHOLESALE_MIN_QTY) return;
    const message = this.buildWhatsAppMessage();
    const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  },
};

// Renderização do grid da aba Atacado: busca, filtro de categoria e steppers de quantidade.
(function () {
  const grid = document.getElementById("wholesale-grid");
  const searchInput = document.getElementById("wholesale-search-input");
  const categoryFilter = document.getElementById("wholesale-category-filter");
  const resultsCount = document.getElementById("wholesale-results-count");
  const emptyState = document.getElementById("wholesale-empty-state");
  const checkoutBtn = document.getElementById("wholesale-checkout-btn");
  const cardMap = new Map();
  let availableProducts = [];
  let initialized = false;

  function debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function normalize(text) {
    return (text || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function formatCurrency(value) {
    return value.toLocaleString(CONFIG.CURRENCY_LOCALE, {
      style: "currency",
      currency: CONFIG.CURRENCY,
    });
  }

  function buildCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = String(product.id);

    const subtitle = [product.brand, product.flavor].filter(Boolean).join(" · ");
    const currentQty = WholesaleCart.getQty(product.id);

    card.innerHTML = `
      <img class="product-card__img" src="${product.image}" alt="${product.name}" loading="lazy" width="200" height="200">
      <div class="product-card__body">
        <p class="product-card__category">${product.category}</p>
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__subtitle">${subtitle}</p>
        <p class="product-card__price">${formatCurrency(product.wholesalePrice)} <span style="font-weight:400;font-size:0.75rem;color:var(--text-muted);">/ un.</span></p>
        <div class="wholesale-card__qty">
          <button type="button" class="qty-btn" data-action="decrease" aria-label="Diminuir quantidade de ${product.name}">−</button>
          <input type="number" min="0" step="1" value="${currentQty}" class="qty-input" aria-label="Quantidade de ${product.name}">
          <button type="button" class="qty-btn" data-action="increase" aria-label="Aumentar quantidade de ${product.name}">+</button>
        </div>
      </div>
    `;

    const qtyInput = card.querySelector(".qty-input");
    card.querySelector('[data-action="decrease"]').addEventListener("click", () => {
      const next = Math.max(0, Number(qtyInput.value) - 1);
      qtyInput.value = next;
      WholesaleCart.setQty(product.id, next);
    });
    card.querySelector('[data-action="increase"]').addEventListener("click", () => {
      const next = Number(qtyInput.value) + 1;
      qtyInput.value = next;
      WholesaleCart.setQty(product.id, next);
    });
    qtyInput.addEventListener("change", () => {
      WholesaleCart.setQty(product.id, Number(qtyInput.value));
    });

    return card;
  }

  function populateFilterOptions(products) {
    const categories = Array.from(new Set(products.map((p) => p.category))).sort();
    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
  }

  function initGrid(products) {
    const frag = document.createDocumentFragment();
    products.forEach((product) => {
      const card = buildCard(product);
      cardMap.set(product.id, card);
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  function getFiltered() {
    const term = normalize(searchInput.value.trim());
    const category = categoryFilter.value;

    return availableProducts.filter((p) => {
      if (category && p.category !== category) return false;
      if (term) {
        const haystack = normalize(`${p.name} ${p.brand} ${p.flavor || ""}`);
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }

  function render() {
    const filtered = getFiltered();
    const visibleIds = new Set(filtered.map((p) => p.id));

    cardMap.forEach((el, id) => {
      if (!visibleIds.has(id)) {
        el.classList.add("is-hidden");
      }
    });

    const frag = document.createDocumentFragment();
    filtered.forEach((p) => {
      const el = cardMap.get(p.id);
      el.classList.remove("is-hidden");
      frag.appendChild(el);
    });
    grid.appendChild(frag);

    const count = filtered.length;
    resultsCount.textContent = `${count} produto${count === 1 ? "" : "s"} encontrado${count === 1 ? "" : "s"}`;
    emptyState.hidden = count !== 0;
  }

  window.initWholesaleTab = function initWholesaleTab() {
    if (initialized) return;
    initialized = true;

    WholesaleCart.load();
    availableProducts = Products.getAvailable();

    document.getElementById("wholesale-min-qty").textContent = CONFIG.WHOLESALE_MIN_QTY;

    if (availableProducts.length === 0) return;

    populateFilterOptions(availableProducts);
    initGrid(availableProducts);
    render();
    WholesaleCart.renderSummary();

    searchInput.addEventListener("input", debounce(render, 200));
    categoryFilter.addEventListener("change", render);
    checkoutBtn.addEventListener("click", () => WholesaleCart.checkout());
  };
})();
