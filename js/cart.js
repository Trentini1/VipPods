// Lógica do carrinho de compras: adicionar, alterar quantidade, remover,
// renderizar e finalizar pedido via WhatsApp.
const Cart = {
  STORAGE_KEY: "vippods_cart",
  items: {}, // { [productId]: quantidade }

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.items = raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn("[VIPpods] Carrinho salvo estava corrompido, iniciando vazio.", err);
      this.items = {};
    }
  },

  persist() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    } catch (err) {
      console.warn("[VIPpods] Não foi possível salvar o carrinho no localStorage.", err);
    }
  },

  addItem(productId, qty = 1) {
    const current = this.items[productId] || 0;
    this.items[productId] = current + qty;
    this.persist();
    this.renderCart();
  },

  changeQty(productId, newQty) {
    const qty = Math.max(0, Math.floor(newQty));
    if (qty === 0) {
      this.removeItem(productId);
      return;
    }
    this.items[productId] = qty;
    this.persist();
    this.renderCart();
  },

  removeItem(productId) {
    delete this.items[productId];
    this.persist();
    this.renderCart();
  },

  clear() {
    this.items = {};
    this.persist();
    this.renderCart();
  },

  getEntries() {
    return Object.entries(this.items)
      .map(([id, qty]) => {
        const product = Products.getById(Number(id));
        return product ? { product, qty } : null;
      })
      .filter(Boolean);
  },

  getTotalCount() {
    return Object.values(this.items).reduce((sum, qty) => sum + qty, 0);
  },

  getSubtotal() {
    return this.getEntries().reduce((sum, { product, qty }) => sum + product.price * qty, 0);
  },

  formatCurrency(value) {
    return UI.formatCurrency(value);
  },

  renderCart() {
    const countEl = document.getElementById("cart-count");
    const bodyEl = document.getElementById("cart-body");
    const emptyEl = document.getElementById("cart-empty");
    const footerEl = document.getElementById("cart-footer");
    const subtotalEl = document.getElementById("cart-subtotal");
    const shippingEl = document.getElementById("cart-shipping");
    const totalEl = document.getElementById("cart-total");
    if (!bodyEl) return;

    const entries = this.getEntries();
    const totalCount = this.getTotalCount();

    if (countEl) {
      countEl.textContent = String(totalCount);
      countEl.hidden = totalCount === 0;
    }

    if (entries.length === 0) {
      bodyEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      if (footerEl) footerEl.hidden = true;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (footerEl) footerEl.hidden = false;

    bodyEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    entries.forEach(({ product, qty }) => {
      const row = document.createElement("li");
      row.className = "cart-item";
      row.innerHTML = `
        <img class="cart-item__img" src="${product.image}" alt="${product.name}" loading="lazy" width="56" height="56">
        <div class="cart-item__info">
          <p class="cart-item__name">${product.name}</p>
          <p class="cart-item__price">${this.formatCurrency(product.price)}</p>
        </div>
        <div class="cart-item__qty">
          <button type="button" class="qty-btn" data-action="decrease" aria-label="Diminuir quantidade de ${product.name}">${Icons.minus}</button>
          <input type="number" min="1" value="${qty}" class="qty-input" aria-label="Quantidade de ${product.name}">
          <button type="button" class="qty-btn" data-action="increase" aria-label="Aumentar quantidade de ${product.name}">${Icons.plus}</button>
        </div>
        <button type="button" class="cart-item__remove" aria-label="Remover ${product.name} do carrinho">${Icons.trash}</button>
      `;

      row.querySelector('[data-action="decrease"]').addEventListener("click", () => {
        this.changeQty(product.id, qty - 1);
      });
      row.querySelector('[data-action="increase"]').addEventListener("click", () => {
        this.changeQty(product.id, qty + 1);
      });
      row.querySelector(".qty-input").addEventListener("change", (e) => {
        this.changeQty(product.id, Number(e.target.value));
      });
      row.querySelector(".cart-item__remove").addEventListener("click", () => {
        this.removeItem(product.id);
      });

      frag.appendChild(row);
    });
    bodyEl.appendChild(frag);

    const subtotal = this.getSubtotal();
    if (subtotalEl) subtotalEl.textContent = this.formatCurrency(subtotal);
    if (shippingEl) shippingEl.textContent = "A combinar";
    if (totalEl) totalEl.textContent = this.formatCurrency(subtotal);
  },

  buildWhatsAppMessage() {
    const entries = this.getEntries();
    const subtotal = this.getSubtotal();

    const lines = [`Olá! Quero fazer um pedido na ${CONFIG.STORE_NAME}:`, ""];
    entries.forEach(({ product, qty }) => {
      lines.push(`• ${qty}x ${product.name} - ${this.formatCurrency(product.price * qty)}`);
    });
    lines.push("");
    lines.push(`Subtotal: ${this.formatCurrency(subtotal)}`);
    lines.push("Frete: a combinar (aguardo a taxa de entrega)");

    return lines.join("\n");
  },

  checkout() {
    if (this.getEntries().length === 0) return;
    const message = this.buildWhatsAppMessage();
    const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  },
};
