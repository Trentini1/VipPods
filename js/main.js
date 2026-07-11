// Navegação em abas (com memória de scroll por aba), Espectro de sabor,
// segmented de categoria, rail de marca, busca/ordenar e grid paginado
// (24 em 24, IntersectionObserver) da aba Produtos + destaques da Início.
(function () {
  const grid = document.getElementById("product-grid");
  const searchInput = document.getElementById("search-input");
  const sortToggle = document.getElementById("sort-toggle");
  const sortMenu = document.getElementById("sort-menu");
  const resultsCount = document.getElementById("results-count");
  const emptyStateEl = document.getElementById("empty-state");
  const loadErrorBanner = document.getElementById("load-error-banner");
  const categorySegmentedEl = document.getElementById("category-segmented");
  const flavorSpectrumEl = document.getElementById("flavor-spectrum");
  const homeSpectrumEl = document.getElementById("home-spectrum");
  const brandRailEl = document.getElementById("brand-rail");
  const sentinel = document.getElementById("grid-sentinel");

  const PAGE_SIZE = 24;
  const filterState = { category: "", flavor: "", brand: "", search: "", sort: "relevance" };

  let availableProducts = [];
  let brandList = [];
  let flavorList = []; // [{ key: <sabor real>, label: <sabor real>, family: <chave de cor> }]

  // Sabores reais presentes no catálogo, agrupados pela família de cor (pro
  // Espectro continuar lendo como um degradê) mas identificados e filtrados
  // pelo nome de sabor de verdade — não pelo nome genérico da família.
  function buildFlavorList(products) {
    const byFlavor = new Map();
    products.forEach((p) => {
      if (p.flavor && !byFlavor.has(p.flavor)) {
        byFlavor.set(p.flavor, Flavors.getFamily(p));
      }
    });
    const familyOrder = Flavors.FAMILIES.map((f) => f.key);
    return Array.from(byFlavor.entries())
      .map(([flavor, family]) => ({ key: flavor, label: flavor, family }))
      .sort((a, b) => {
        const diff = familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family);
        return diff !== 0 ? diff : a.label.localeCompare(b.label, "pt-BR");
      });
  }

  let filteredList = [];
  let renderedCount = 0;
  let initialGridRendered = false;
  let gridObserver = null;

  function debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function categoryLabel(value) {
    const found = UI.CATEGORY_OPTIONS.find((o) => o.value === value);
    return found ? found.label : value;
  }

  // ---------- Card de produto (varejo: preço + botão ⊕) ----------
  function stockNoteFor(product) {
    const qty = Number(product.stockQty);
    if (!Number.isFinite(qty) || qty < 0) return "";
    return `${qty} em estoque`;
  }

  function renderCard(product, indexInBatch, eager) {
    const qty = Number(product.stockQty);
    const { card, footer } = UI.buildProductCardBase(product, {
      price: product.price,
      eager,
      stockNote: stockNoteFor(product),
      stockLow: Number.isFinite(qty) && qty > 0 && qty <= 5,
    });
    card.style.animationDelay = indexInBatch < 8 ? `${indexInBatch * 24}ms` : "0ms";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "product-card__add";
    addBtn.setAttribute("aria-label", `Adicionar ${product.name} ao carrinho`);
    addBtn.innerHTML = Icons.plus;
    addBtn.addEventListener("click", () => Cart.addItem(product.id, 1));
    footer.appendChild(addBtn);

    return card;
  }

  // ---------- Destaques (aba Início) ----------
  function renderFeatured(products) {
    const featuredGrid = document.getElementById("featured-grid");
    if (!featuredGrid) return;
    let featured = products.filter((p) => p.featured).slice(0, 4);
    if (featured.length === 0) featured = products.slice(0, 4);

    featuredGrid.innerHTML = "";
    const frag = document.createDocumentFragment();
    featured.forEach((p, i) => frag.appendChild(renderCard(p, i, i < 2)));
    featuredGrid.appendChild(frag);
  }

  // ---------- Filtro + grid paginado (aba Produtos) ----------
  function computeFilteredList() {
    const term = UI.normalize(filterState.search.trim());

    let list = availableProducts.filter((p) => {
      if (filterState.category && p.category !== filterState.category) return false;
      if (filterState.brand && p.brand !== filterState.brand) return false;
      if (filterState.flavor && p.flavor !== filterState.flavor) return false;
      if (term) {
        const haystack = UI.normalize(`${p.name} ${p.brand} ${p.flavor || ""}`);
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    switch (filterState.sort) {
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
        break;
    }
    return list;
  }

  function updateResultsCount() {
    const count = filteredList.length;
    resultsCount.textContent = `${count} produto${count === 1 ? "" : "s"} encontrado${count === 1 ? "" : "s"}`;
  }

  function clearFilter(which) {
    if (which === "search") {
      searchInput.value = "";
      filterState.search = "";
    } else if (which === "all") {
      filterState.category = "";
      filterState.brand = "";
      filterState.flavor = "";
      filterState.search = "";
      searchInput.value = "";
    } else {
      filterState[which] = "";
    }
    refreshFilterControls();
    renderGrid(true);
  }

  function updateEmptyState() {
    if (filteredList.length !== 0) {
      emptyStateEl.hidden = true;
      emptyStateEl.innerHTML = "";
      return;
    }
    emptyStateEl.hidden = false;

    const term = filterState.search.trim();
    if (term) {
      emptyStateEl.innerHTML = `
        <strong>Nenhum pod com esse nome.</strong>
        Tente pela marca ou escolha um sabor no topo.
        <div><button type="button" data-clear="search">Limpar busca</button></div>
      `;
    } else {
      const chips = [];
      if (filterState.flavor) chips.push(["flavor", `Remover filtro de sabor: ${filterState.flavor}`]);
      if (filterState.brand) chips.push(["brand", `Remover filtro de marca: ${filterState.brand}`]);
      if (filterState.category) chips.push(["category", `Remover filtro de categoria: ${categoryLabel(filterState.category)}`]);

      let html = "<strong>Nenhum pod com esses filtros.</strong><div>";
      html += chips.map(([key, label]) => `<button type="button" data-clear="${key}">${label}</button>`).join(" ");
      if (chips.length > 1) html += ` <button type="button" data-clear="all">Limpar tudo</button>`;
      html += "</div>";
      emptyStateEl.innerHTML = html;
    }

    emptyStateEl.querySelectorAll("button[data-clear]").forEach((btn) => {
      btn.addEventListener("click", () => clearFilter(btn.dataset.clear));
    });
  }

  function renderGrid(reset) {
    if (reset) {
      filteredList = computeFilteredList();
      grid.innerHTML = "";
      renderedCount = 0;
    }

    const nextBatch = filteredList.slice(renderedCount, renderedCount + PAGE_SIZE);
    const frag = document.createDocumentFragment();
    nextBatch.forEach((p, i) => {
      const globalIndex = renderedCount + i;
      const eager = !initialGridRendered && globalIndex < 4;
      const indexInBatch = reset ? globalIndex : 8; // só a entrada inicial do grid recebe stagger
      frag.appendChild(renderCard(p, indexInBatch, eager));
    });
    grid.appendChild(frag);
    renderedCount += nextBatch.length;
    initialGridRendered = true;

    updateResultsCount();
    updateEmptyState();
  }

  function setupGridObserver() {
    gridObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && renderedCount < filteredList.length) {
            renderGrid(false);
          }
        });
      },
      { rootMargin: "600px 0px" }
    );
    gridObserver.observe(sentinel);
  }

  // ---------- Controles de filtro (segmented / espectro / rail de marca) ----------
  function onCategoryChange(value) {
    filterState.category = value;
    refreshFilterControls();
    renderGrid(true);
  }

  function onFlavorChange(value) {
    filterState.flavor = value;
    refreshFilterControls();
    renderGrid(true);
  }

  function onBrandChange(value) {
    filterState.brand = value;
    refreshFilterControls();
    renderGrid(true);
  }

  function refreshFilterControls() {
    UI.renderSegmentedControl(categorySegmentedEl, UI.CATEGORY_OPTIONS, filterState.category, onCategoryChange);
    UI.renderSpectrum(flavorSpectrumEl, flavorList, filterState.flavor, onFlavorChange);
    UI.renderChipRail(brandRailEl, brandList, filterState.brand, onBrandChange);
    if (homeSpectrumEl) {
      UI.renderSpectrum(homeSpectrumEl, flavorList, filterState.flavor, (value) => {
        onFlavorChange(value);
        activateTab("products");
      });
    }
  }

  // ---------- Busca ----------
  const debouncedRenderGrid = debounce(() => renderGrid(true), 200);

  // ---------- Ordenar (menu) ----------
  function closeSortMenu() {
    sortMenu.hidden = true;
    sortToggle.setAttribute("aria-expanded", "false");
  }

  function openSortMenu() {
    sortMenu.hidden = false;
    sortToggle.setAttribute("aria-expanded", "true");
  }

  function initSortMenu() {
    sortToggle.addEventListener("click", () => {
      if (sortMenu.hidden) openSortMenu();
      else closeSortMenu();
    });

    sortMenu.querySelectorAll("li").forEach((li) => {
      const select = () => {
        filterState.sort = li.dataset.sort;
        sortMenu.querySelectorAll("li").forEach((el) => el.setAttribute("aria-selected", String(el === li)));
        closeSortMenu();
        renderGrid(true);
      };
      li.addEventListener("click", select);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select();
        }
      });
    });

    document.addEventListener("click", (e) => {
      if (!sortMenu.hidden && !e.target.closest(".toolbar")) closeSortMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !sortMenu.hidden) {
        closeSortMenu();
        sortToggle.focus();
      }
    });
  }

  // ---------- Navegação em abas (com memória de scroll por aba) ----------
  const tabScrollY = {};

  function activateTab(tabName) {
    const current = document.querySelector(".app-tab.is-active");
    if (current) tabScrollY[current.dataset.tabPanel] = window.scrollY;

    document.querySelectorAll(".app-tab").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.tabPanel === tabName);
    });
    document.querySelectorAll(".bottom-nav__item").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.tabTarget === tabName);
    });
    window.scrollTo(0, tabScrollY[tabName] || 0);
  }
  window.activateTab = activateTab;

  function initTabs() {
    document.querySelectorAll("[data-tab-target]").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget));
    });
    document.querySelectorAll("[data-goto-tab]").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.gotoTab));
    });
  }

  async function bootstrap() {
    UI.bindPressFx();

    const searchIconSlot = document.getElementById("search-icon-slot");
    if (searchIconSlot) searchIconSlot.innerHTML = Icons.search;
    const sortChevronSlot = document.getElementById("sort-chevron-slot");
    if (sortChevronSlot) sortChevronSlot.innerHTML = Icons.chevronDown;

    await Products.load();
    availableProducts = Products.getAvailable();

    if (availableProducts.length === 0) {
      if (loadErrorBanner) {
        loadErrorBanner.hidden = false;
        loadErrorBanner.textContent =
          "Não foi possível carregar o catálogo de produtos. Tente recarregar a página.";
      }
      if (resultsCount) resultsCount.textContent = "0 produtos encontrados";
      if (emptyStateEl) {
        emptyStateEl.hidden = false;
        emptyStateEl.innerHTML = "<strong>Não deu pra carregar o catálogo.</strong> Verifique a conexão.";
      }
      return;
    }

    flavorList = buildFlavorList(availableProducts);
    brandList = Array.from(new Set(availableProducts.map((p) => p.brand))).sort();

    refreshFilterControls();
    renderFeatured(availableProducts);
    renderGrid(true);
    setupGridObserver();
    initSortMenu();

    if (typeof window.initWholesaleTab === "function") {
      window.initWholesaleTab();
    }

    searchInput.addEventListener("input", () => {
      filterState.search = searchInput.value;
      debouncedRenderGrid();
    });
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
