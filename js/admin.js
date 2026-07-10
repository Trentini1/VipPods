// Painel admin. Login usa Firebase Authentication (e-mail fixo em
// CONFIG.ADMIN_EMAIL + senha cadastrada no Firebase Console) e as edições
// (preço, custo, estoque, foto) são gravadas no Firebase Realtime Database,
// então valem na hora pra todo mundo que visita o site — não só pra quem editou.
(function () {
  const OVERRIDES_PATH = "overrides";
  const PRICING_PATH = "pricing";

  const loginSection = document.getElementById("admin-login");
  const loginForm = document.getElementById("admin-login-form");
  const loginError = document.getElementById("admin-login-error");
  const passwordInput = document.getElementById("admin-password");
  const panel = document.getElementById("admin-panel");
  const loadErrorEl = document.getElementById("admin-load-error");
  const tableBody = document.getElementById("admin-table-body");
  const searchInput = document.getElementById("admin-search");
  const logoutBtn = document.getElementById("admin-logout");
  const markAllOutBtn = document.getElementById("admin-mark-all-out");
  const markAllInBtn = document.getElementById("admin-mark-all-in");
  const tabInBtn = document.getElementById("admin-tab-in");
  const tabOutBtn = document.getElementById("admin-tab-out");
  const tabInCountEl = document.getElementById("admin-tab-in-count");
  const tabOutCountEl = document.getElementById("admin-tab-out-count");

  const retailRateInput = document.getElementById("retail-rate");
  const retailMarkupInput = document.getElementById("retail-markup");
  const wholesaleRateInput = document.getElementById("wholesale-rate");
  const wholesaleMarkupInput = document.getElementById("wholesale-markup");
  const applyRetailBtn = document.getElementById("apply-retail-pricing");
  const applyWholesaleBtn = document.getElementById("apply-wholesale-pricing");

  let overrides = {};
  let pricing = {};
  let currentTab = "in"; // 'in' | 'out'
  const rowRefs = new Map(); // id -> { row, badge, checkbox, priceInput, costInput, wholesaleInput, thumb }

  async function loadOverrides() {
    try {
      const snap = await firebaseDb.ref(OVERRIDES_PATH).once("value");
      overrides = snap.val() || {};
    } catch (err) {
      console.warn("[VIPpods admin] Não foi possível carregar overrides do Firebase.", err);
      overrides = {};
    }
  }

  function persistOverrides() {
    firebaseDb.ref(OVERRIDES_PATH).set(overrides).catch((err) => {
      console.error("[VIPpods admin] Não foi possível salvar no Firebase:", err);
      alert(
        "Não foi possível sincronizar essa alteração com o Firebase (verifique sua conexão e se você continua logado). " +
          'Clique em "Baixar products.json" agora pra não perder o que já foi editado.'
      );
    });
  }

  async function loadPricing() {
    try {
      const snap = await firebaseDb.ref(PRICING_PATH).once("value");
      pricing = snap.val() || { ...CONFIG.DEFAULT_PRICING };
    } catch (err) {
      pricing = { ...CONFIG.DEFAULT_PRICING };
    }
    retailRateInput.value = pricing.retailRate;
    retailMarkupInput.value = pricing.retailMarkup;
    wholesaleRateInput.value = pricing.wholesaleRate;
    wholesaleMarkupInput.value = pricing.wholesaleMarkup;
  }

  function persistPricing() {
    pricing = {
      retailRate: Number(retailRateInput.value) || 0,
      retailMarkup: Number(retailMarkupInput.value) || 0,
      wholesaleRate: Number(wholesaleRateInput.value) || 0,
      wholesaleMarkup: Number(wholesaleMarkupInput.value) || 0,
    };
    firebaseDb.ref(PRICING_PATH).set(pricing).catch((err) => {
      console.error("[VIPpods admin] Não foi possível salvar a precificação no Firebase:", err);
    });
  }

  // Redimensiona/comprime a imagem no navegador antes de embutir como base64,
  // pra não estourar o limite de localStorage nem deixar o products.json gigante.
  function resizeImageToDataUrl(file, maxSize = 400, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / img.width, maxSize / img.height);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível ler essa imagem."));
      };
      img.src = objectUrl;
    });
  }

  function getEffective(product) {
    const ov = overrides[product.id];
    return ov ? { ...product, ...ov } : product;
  }

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

  function setRowStockUI(refs, inStock) {
    refs.checkbox.checked = !inStock;
    refs.badge.className = `badge ${inStock ? "badge--ok" : "badge--out"}`;
    refs.badge.textContent = inStock ? "Em estoque" : "Fora de estoque";
    refs.row.className = inStock ? "" : "out-of-stock";
  }

  function buildRow(product) {
    const tr = document.createElement("tr");
    tr.dataset.id = String(product.id);

    const inStock = product.inStock;
    tr.className = inStock ? "" : "out-of-stock";

    tr.innerHTML = `
      <td>${product.id}</td>
      <td>
        <img src="${product.image}" alt="" class="admin-thumb">
        <input type="file" accept="image/*" class="photo-input" aria-label="Trocar foto de ${product.name}">
      </td>
      <td>${product.name}</td>
      <td>${product.brand}</td>
      <td>${product.category}</td>
      <td><input type="number" min="0" step="0.01" class="cost-input" value="${product.costUSD ?? 0}" aria-label="Custo em dólar de ${product.name}"></td>
      <td><input type="number" min="0" step="0.01" class="price-input" value="${product.price}" aria-label="Preço varejo de ${product.name}"></td>
      <td><input type="number" min="0" step="0.01" class="wholesale-input" value="${product.wholesalePrice ?? 0}" aria-label="Preço atacado de ${product.name}"></td>
      <td><span class="badge ${inStock ? "badge--ok" : "badge--out"}">${inStock ? "Em estoque" : "Fora de estoque"}</span></td>
      <td><input type="checkbox" class="stock-checkbox" ${inStock ? "" : "checked"} aria-label="Marcar ${product.name} como fora de estoque"></td>
    `;

    const priceInput = tr.querySelector(".price-input");
    const costInput = tr.querySelector(".cost-input");
    const wholesaleInput = tr.querySelector(".wholesale-input");
    const stockCheckbox = tr.querySelector(".stock-checkbox");
    const badge = tr.querySelector(".badge");
    const photoInput = tr.querySelector(".photo-input");
    const thumb = tr.querySelector(".admin-thumb");

    const refs = { row: tr, badge, checkbox: stockCheckbox, priceInput, costInput, wholesaleInput, thumb };
    rowRefs.set(product.id, refs);

    photoInput.addEventListener("change", async () => {
      const file = photoInput.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Selecione um arquivo de imagem válido.");
        photoInput.value = "";
        return;
      }
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        overrides[product.id] = { ...(overrides[product.id] || {}), image: dataUrl };
        persistOverrides();
        thumb.src = dataUrl;
      } catch (err) {
        console.error("[VIPpods admin] Erro ao processar imagem:", err);
        alert("Não foi possível processar essa imagem.");
      } finally {
        photoInput.value = "";
      }
    });

    priceInput.addEventListener("change", () => {
      const value = Number(priceInput.value);
      if (Number.isNaN(value) || value < 0) {
        priceInput.value = product.price;
        return;
      }
      overrides[product.id] = { ...(overrides[product.id] || {}), price: value };
      persistOverrides();
    });

    costInput.addEventListener("change", () => {
      const value = Number(costInput.value);
      if (Number.isNaN(value) || value < 0) {
        costInput.value = product.costUSD ?? 0;
        return;
      }
      overrides[product.id] = { ...(overrides[product.id] || {}), costUSD: value };
      persistOverrides();
    });

    wholesaleInput.addEventListener("change", () => {
      const value = Number(wholesaleInput.value);
      if (Number.isNaN(value) || value < 0) {
        wholesaleInput.value = product.wholesalePrice ?? 0;
        return;
      }
      overrides[product.id] = { ...(overrides[product.id] || {}), wholesalePrice: value };
      persistOverrides();
    });

    stockCheckbox.addEventListener("change", () => {
      const nowInStock = !stockCheckbox.checked;
      overrides[product.id] = { ...(overrides[product.id] || {}), inStock: nowInStock };
      persistOverrides();
      setRowStockUI(refs, nowInStock);
      applyTabAndSearch();
    });

    return tr;
  }

  function renderTable(products) {
    const frag = document.createDocumentFragment();
    products.forEach((p) => {
      const row = buildRow(p);
      frag.appendChild(row);
    });
    tableBody.appendChild(frag);
  }

  function getRowInStock(id) {
    const base = Products.getById(id);
    const ov = overrides[id];
    return ov && typeof ov.inStock === "boolean" ? ov.inStock : base.inStock;
  }

  function applyTabAndSearch() {
    const term = normalize(searchInput.value.trim());
    let inCount = 0;
    let outCount = 0;

    rowRefs.forEach((refs, id) => {
      const inStock = getRowInStock(id);
      if (inStock) inCount++;
      else outCount++;

      const matchesTab = currentTab === "in" ? inStock : !inStock;
      let matchesSearch = true;
      if (term) {
        const product = Products.getById(id);
        const haystack = normalize(`${product.name} ${product.brand} ${product.category}`);
        matchesSearch = haystack.includes(term);
      }
      refs.row.hidden = !(matchesTab && matchesSearch);
    });

    tabInCountEl.textContent = `(${inCount})`;
    tabOutCountEl.textContent = `(${outCount})`;
  }

  function switchTab(tab) {
    currentTab = tab;
    tabInBtn.classList.toggle("is-active", tab === "in");
    tabOutBtn.classList.toggle("is-active", tab === "out");
    applyTabAndSearch();
  }

  function applyBulkPricing(field, rateInput, markupInput, targetField) {
    persistPricing();
    const rate = Number(rateInput.value) || 0;
    const markup = Number(markupInput.value) || 0;

    Products.getAll().forEach((product) => {
      const effective = getEffective(product);
      const cost = Number(effective.costUSD) || 0;
      const newValue = calcPrice(cost, rate, markup);
      overrides[product.id] = { ...(overrides[product.id] || {}), [targetField]: newValue };

      const refs = rowRefs.get(product.id);
      if (refs) {
        refs[field].value = newValue;
      }
    });

    persistOverrides();
  }

  async function initPanel() {
    await loadOverrides();
    await loadPricing();
    await Products.load();
    let products = Products.getAll();

    if (products.length === 0) {
      loadErrorEl.hidden = false;
      loadErrorEl.textContent = "Não foi possível carregar o catálogo de produtos.";
      return;
    }

    // aplica os overrides já salvos no Firebase por cima do catálogo base pra exibição
    products = products.map((p) => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p));

    renderTable(products);
    applyTabAndSearch();

    searchInput.addEventListener("input", debounce(applyTabAndSearch, 150));

    tabInBtn.addEventListener("click", () => switchTab("in"));
    tabOutBtn.addEventListener("click", () => switchTab("out"));

    markAllOutBtn.addEventListener("click", () => {
      const confirmed = confirm(
        "Tem certeza que deseja marcar TODOS os produtos como fora de estoque? " +
          "Eles vão sumir do catálogo público até você reativar cada um (ou reverter aqui)."
      );
      if (!confirmed) return;

      Products.getAll().forEach((product) => {
        overrides[product.id] = { ...(overrides[product.id] || {}), inStock: false };
        const refs = rowRefs.get(product.id);
        if (refs) setRowStockUI(refs, false);
      });
      persistOverrides();
      applyTabAndSearch();
    });

    markAllInBtn.addEventListener("click", () => {
      const confirmed = confirm(
        "Tem certeza que deseja restaurar TODOS os produtos pra 'em estoque'? " +
          "Isso remove qualquer override manual de estoque salvo (mantém preço/custo/foto)."
      );
      if (!confirmed) return;

      Products.getAll().forEach((product) => {
        const ov = { ...(overrides[product.id] || {}) };
        delete ov.inStock;
        if (Object.keys(ov).length === 0) {
          delete overrides[product.id];
        } else {
          overrides[product.id] = ov;
        }
        const refs = rowRefs.get(product.id);
        if (refs) setRowStockUI(refs, true);
      });
      persistOverrides();
      applyTabAndSearch();
    });

    applyRetailBtn.addEventListener("click", () => {
      applyBulkPricing("priceInput", retailRateInput, retailMarkupInput, "price");
    });
    applyWholesaleBtn.addEventListener("click", () => {
      applyBulkPricing("wholesaleInput", wholesaleRateInput, wholesaleMarkupInput, "wholesalePrice");
    });

    [retailRateInput, retailMarkupInput, wholesaleRateInput, wholesaleMarkupInput].forEach((input) => {
      input.addEventListener("change", persistPricing);
    });
  }

  let panelStarted = false;

  function showPanel() {
    loginSection.hidden = true;
    panel.hidden = false;
    if (!panelStarted) {
      panelStarted = true;
      initPanel();
    }
  }

  function showLogin() {
    panelStarted = false;
    loginSection.hidden = false;
    panel.hidden = true;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.style.display = "none";
    try {
      await firebaseAuth.signInWithEmailAndPassword(CONFIG.ADMIN_EMAIL, passwordInput.value);
      passwordInput.value = "";
    } catch (err) {
      console.warn("[VIPpods admin] Falha no login:", err);
      loginError.textContent = "Senha incorreta.";
      loginError.style.display = "block";
    }
  });

  logoutBtn.addEventListener("click", () => {
    firebaseAuth.signOut();
  });

  firebaseAuth.onAuthStateChanged((user) => {
    if (user) {
      showPanel();
    } else {
      showLogin();
    }
  });
})();
