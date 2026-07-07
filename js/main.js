// Navegação em abas, carrossel de destaques, busca/filtros/ordenação e
// renderização do grid de produtos (aba "Produtos").
(function () {
  const grid = document.getElementById("product-grid");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const brandFilter = document.getElementById("brand-filter");
  const sortSelect = document.getElementById("sort-select");
  const resultsCount = document.getElementById("results-count");
  const emptyState = document.getElementById("empty-state");
  const loadErrorBanner = document.getElementById("load-error-banner");
  const cardMap = new Map();
  let availableProducts = [];

  function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function normalize(text) {
    return (text || "")
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
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
    const puffsLabel = product.puffs ? `${product.puffs.toLocaleString("pt-BR")} puffs` : "";

    card.innerHTML = `
      <img class="product-card__img" src="${product.image}" alt="${product.name}" loading="lazy" width="200" height="200">
      <div class="product-card__body">
        <p class="product-card__category">${product.category}</p>
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__subtitle">${subtitle}${puffsLabel ? " · " + puffsLabel : ""}</p>
        <p class="product-card__price">${formatCurrency(product.price)}</p>
        <button type="button" class="btn btn--primary product-card__add" aria-label="Adicionar ${product.name} ao carrinho">
          Adicionar ao carrinho
        </button>
      </div>
    `;

    card.querySelector(".product-card__add").addEventListener("click", () => {
      Cart.addItem(product.id, 1);
    });

    return card;
  }

  function populateFilterOptions(products) {
    const categories = Array.from(new Set(products.map((p) => p.category))).sort();
    const brands = Array.from(new Set(products.map((p) => p.brand))).sort();

    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    brands.forEach((brand) => {
      const opt = document.createElement("option");
      opt.value = brand;
      opt.textContent = brand;
      brandFilter.appendChild(opt);
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
    const brand = brandFilter.value;
    const sortBy = sortSelect.value;

    let list = availableProducts.filter((p) => {
      if (category && p.category !== category) return false;
      if (brand && p.brand !== brand) return false;
      if (term) {
        const haystack = normalize(`${p.name} ${p.brand} ${p.flavor || ""}`);
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    switch (sortBy) {
      case "price-asc":
        list = list.slice().sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = list.slice().sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        list = list.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        break;
      default:
        // mantém a ordem original (relevância)
        break;
    }

    return list;
  }

  // Reaproveita os nós de card já criados: apenas oculta/mostra e reordena,
  // sem recriar o DOM a cada busca/filtro (importante com 555 produtos).
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
    if (resultsCount) {
      resultsCount.textContent = `${count} produto${count === 1 ? "" : "s"} encontrado${count === 1 ? "" : "s"}`;
    }
    if (emptyState) {
      emptyState.hidden = count !== 0;
    }
  }

  const debouncedRender = debounce(render, 200);

  // ---------- Carrossel de destaques (aba Início) ----------
  function initCarousel(products) {
    const track = document.getElementById("carousel-track");
    const dotsContainer = document.getElementById("carousel-dots");
    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");

    let featured = products.filter((p) => p.featured).slice(0, 3);
    if (featured.length === 0) {
      featured = products.slice(0, 3);
    }
    if (featured.length === 0) {
      track.closest(".carousel").hidden = true;
      return;
    }

    let currentIndex = 0;
    let autoplayTimer = null;

    featured.forEach((product) => {
      const slide = document.createElement("div");
      slide.className = "carousel__slide";
      const subtitle = [product.brand, product.flavor].filter(Boolean).join(" · ");
      slide.innerHTML = `
        <img class="carousel__slide-img" src="${product.image}" alt="${product.name}" loading="lazy">
        <div>
          <p class="carousel__slide-category">${product.category}</p>
          <h2 class="carousel__slide-name">${product.name}</h2>
          <p class="carousel__slide-subtitle">${subtitle}</p>
          <p class="carousel__slide-price">${formatCurrency(product.price)}</p>
          <button type="button" class="btn btn--primary carousel__slide-add">Adicionar ao carrinho</button>
        </div>
      `;
      slide.querySelector(".carousel__slide-add").addEventListener("click", () => {
        Cart.addItem(product.id, 1);
      });
      track.appendChild(slide);
    });

    featured.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `Ir para destaque ${i + 1}`);
      dot.addEventListener("click", () => {
        goTo(i);
        resetAutoplay();
      });
      dotsContainer.appendChild(dot);
    });

    function updateDots() {
      Array.from(dotsContainer.children).forEach((dot, i) => {
        dot.classList.toggle("is-active", i === currentIndex);
      });
    }

    function goTo(index) {
      currentIndex = (index + featured.length) % featured.length;
      track.scrollTo({ left: track.clientWidth * currentIndex, behavior: "smooth" });
      updateDots();
    }

    function startAutoplay() {
      if (featured.length <= 1) return;
      autoplayTimer = setInterval(() => goTo(currentIndex + 1), 5000);
    }

    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }

    if (featured.length <= 1) {
      prevBtn.hidden = true;
      nextBtn.hidden = true;
    } else {
      prevBtn.addEventListener("click", () => {
        goTo(currentIndex - 1);
        resetAutoplay();
      });
      nextBtn.addEventListener("click", () => {
        goTo(currentIndex + 1);
        resetAutoplay();
      });
    }

    let scrollDebounce;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(() => {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        if (index !== currentIndex) {
          currentIndex = index;
          updateDots();
        }
      }, 100);
    });

    track.addEventListener("pointerdown", () => clearInterval(autoplayTimer));

    startAutoplay();
  }

  // ---------- Navegação em abas ----------
  function activateTab(tabName) {
    document.querySelectorAll(".app-tab").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.tabPanel === tabName);
    });
    document.querySelectorAll(".bottom-nav__item").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.tabTarget === tabName);
    });
    window.scrollTo(0, 0);
  }

  function initTabs() {
    document.querySelectorAll("[data-tab-target]").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget));
    });
    document.querySelectorAll("[data-goto-tab]").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.gotoTab));
    });
  }

  async function bootstrap() {
    await Products.load();
    availableProducts = Products.getAvailable();

    if (availableProducts.length === 0) {
      if (loadErrorBanner) {
        loadErrorBanner.hidden = false;
        loadErrorBanner.textContent =
          "Não foi possível carregar o catálogo de produtos. Tente recarregar a página.";
      }
      if (resultsCount) resultsCount.textContent = "0 produtos encontrados";
      if (emptyState) emptyState.hidden = false;
      return;
    }

    populateFilterOptions(availableProducts);
    initGrid(availableProducts);
    render();
    initCarousel(availableProducts);

    if (typeof window.initWholesaleTab === "function") {
      window.initWholesaleTab();
    }

    searchInput.addEventListener("input", debouncedRender);
    categoryFilter.addEventListener("change", render);
    brandFilter.addEventListener("change", render);
    sortSelect.addEventListener("change", render);
  }

  document.addEventListener("DOMContentLoaded", () => {
    Cart.load();
    Cart.renderCart();
    initTabs();
    bootstrap();

    const checkoutBtn = document.getElementById("checkout-btn");
    const storeNameEls = document.querySelectorAll("[data-store-name]");

    storeNameEls.forEach((el) => {
      el.textContent = CONFIG.STORE_NAME;
    });
    document.title = `${CONFIG.STORE_NAME} - Catálogo`;

    checkoutBtn.addEventListener("click", () => Cart.checkout());
  });
})();
