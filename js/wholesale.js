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
    totalValueEl.textContent = UI.formatCurrency(totalValue);

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
      lines.push(`• ${qty}x ${product.name} - ${UI.formatCurrency(product.wholesalePrice * qty)}`);
    });
    lines.push("");
    lines.push(`Total de unidades: ${this.getTotalQty()}`);
    lines.push(`Total do pedido: ${UI.formatCurrency(total)}`);
    lines.push("Frete: a combinar (aguardo a taxa de entrega)");

    return lines.join("\n");
  },

  checkout() {
    if (this.getTotalQty() < CONFIG.WHOLESALE_MIN_QTY) return;
    const message = this.buildWhatsAppMessage();
    const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  },
};

// Renderização do grid da aba Atacado: segmented de categoria, busca e steppers de quantidade.
(function () {
  const grid = document.getElementById("wholesale-grid");
  const searchInput = document.getElementById("wholesale-search-input");
  const categorySegmentedEl = document.getElementById("wholesale-category-segmented");
  const resultsCount = document.getElementById("wholesale-results-count");
  const emptyState = document.getElementById("wholesale-empty-state");
  const checkoutBtn = document.getElementById("wholesale-checkout-btn");
  let availableProducts = [];
  let initialized = false;
  const filterState = { category: "", search: "" };

  function debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function buildCard(product, index) {
    const { card, footer } = UI.buildProductCardBase(product, {
      price: product.wholesalePrice,
      priceSuffix: ' <span style="font-weight:400;">/ un.</span>',
      eager: index < 4,
    });
    card.style.animationDelay = index < 8 ? `${index * 24}ms` : "0ms";

    const qtyWrap = document.createElement("div");
    qtyWrap.className = "wholesale-card__qty";
    const currentQty = WholesaleCart.getQty(product.id);
    qtyWrap.innerHTML = `
      <button type="button" class="qty-btn" data-action="decrease" aria-label="Diminuir quantidade de ${product.name}">${Icons.minus}</button>
      <input type="number" min="0" step="1" value="${currentQty}" class="qty-input" aria-label="Quantidade de ${product.name}">
      <button type="button" class="qty-btn" data-action="increase" aria-label="Aumentar quantidade de ${product.name}">${Icons.plus}</button>
    `;
    footer.appendChild(qtyWrap);

    const qtyInput = qtyWrap.querySelector(".qty-input");
    qtyWrap.querySelector('[data-action="decrease"]').addEventListener("click", () => {
      const next = Math.max(0, Number(qtyInput.value) - 1);
      qtyInput.value = next;
      WholesaleCart.setQty(product.id, next);
    });
    qtyWrap.querySelector('[data-action="increase"]').addEventListener("click", () => {
      const next = Number(qtyInput.value) + 1;
      qtyInput.value = next;
      WholesaleCart.setQty(product.id, next);
    });
    qtyInput.addEventListener("change", () => {
      WholesaleCart.setQty(product.id, Number(qtyInput.value));
    });

    return card;
  }

  function getFiltered() {
    const term = UI.normalize(filterState.search.trim());
    return availableProducts.filter((p) => {
      if (filterState.category && p.category !== filterState.category) return false;
      if (term) {
        const haystack = UI.normalize(`${p.name} ${p.brand} ${p.flavor || ""}`);
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }

  function render() {
    const filtered = getFiltered();
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    filtered.forEach((p, i) => frag.appendChild(buildCard(p, i)));
    grid.appendChild(frag);

    const count = filtered.length;
    resultsCount.textContent = `${count} produto${count === 1 ? "" : "s"} encontrado${count === 1 ? "" : "s"}`;
    emptyState.hidden = count !== 0;
    if (count === 0) {
      emptyState.innerHTML = filterState.search.trim()
        ? "<strong>Nenhum pod com esse nome.</strong> Tente pela marca."
        : "<strong>Nenhum pod com esses filtros.</strong>";
    }
  }

  function onCategoryChange(value) {
    filterState.category = value;
    UI.renderSegmentedControl(categorySegmentedEl, UI.CATEGORY_OPTIONS, filterState.category, onCategoryChange);
    render();
  }

  window.initWholesaleTab = function initWholesaleTab() {
    if (initialized) return;
    initialized = true;

    WholesaleCart.load();
    availableProducts = Products.getAvailable();

    document.getElementById("wholesale-min-qty").textContent = CONFIG.WHOLESALE_MIN_QTY;

    const searchIconSlot = document.getElementById("wholesale-search-icon-slot");
    if (searchIconSlot) searchIconSlot.innerHTML = Icons.search;

    if (availableProducts.length === 0) return;

    UI.renderSegmentedControl(categorySegmentedEl, UI.CATEGORY_OPTIONS, filterState.category, onCategoryChange);
    render();
    WholesaleCart.renderSummary();

    searchInput.addEventListener("input", debounce(() => {
      filterState.search = searchInput.value;
      render();
    }, 200));
    checkoutBtn.addEventListener("click", () => WholesaleCart.checkout());
  };
})();
