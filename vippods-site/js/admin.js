// Painel admin simples. Senha fica em texto puro no config.js e a sessão
// autenticada é lembrada via localStorage — isso NÃO é segurança real,
// é apenas uma barreira contra acesso casual, como pedido.
(function () {
  const AUTH_KEY = "vippods_admin_auth";
  const OVERRIDES_KEY = "vippods_admin_overrides";

  const loginSection = document.getElementById("admin-login");
  const loginForm = document.getElementById("admin-login-form");
  const loginError = document.getElementById("admin-login-error");
  const passwordInput = document.getElementById("admin-password");
  const panel = document.getElementById("admin-panel");
  const saveBar = document.getElementById("admin-save-bar");
  const statusEl = document.getElementById("admin-status");
  const loadErrorEl = document.getElementById("admin-load-error");
  const tableBody = document.getElementById("admin-table-body");
  const searchInput = document.getElementById("admin-search");
  const logoutBtn = document.getElementById("admin-logout");
  const saveFileBtn = document.getElementById("admin-save-file");
  const downloadBtn = document.getElementById("admin-download");

  let overrides = {};
  let dirty = false;
  const rowMap = new Map();

  function loadOverrides() {
    try {
      const raw = localStorage.getItem(OVERRIDES_KEY);
      overrides = raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn("[VIPpods admin] Overrides salvos estavam corrompidos, ignorando.", err);
      overrides = {};
    }
  }

  function persistOverrides() {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  }

  function setDirty(isDirty) {
    dirty = isDirty;
    saveBar.hidden = false;
    statusEl.textContent = dirty
      ? "Há alterações não salvas no arquivo do projeto."
      : "Nenhuma alteração pendente.";
  }

  function getMergedProducts() {
    return Products.getAll().map((p) => {
      const ov = overrides[p.id];
      return ov ? { ...p, ...ov } : p;
    });
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

  function buildRow(product) {
    const tr = document.createElement("tr");
    tr.dataset.id = String(product.id);

    const inStock = product.inStock;
    tr.className = inStock ? "" : "out-of-stock";

    tr.innerHTML = `
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>${product.brand}</td>
      <td>${product.category}</td>
      <td><input type="number" min="0" step="0.01" class="price-input" value="${product.price}" aria-label="Preço de ${product.name}"></td>
      <td><span class="badge ${inStock ? "badge--ok" : "badge--out"}">${inStock ? "Em estoque" : "Fora de estoque"}</span></td>
      <td><input type="checkbox" class="stock-checkbox" ${inStock ? "" : "checked"} aria-label="Marcar ${product.name} como fora de estoque"></td>
    `;

    const priceInput = tr.querySelector(".price-input");
    const stockCheckbox = tr.querySelector(".stock-checkbox");
    const badge = tr.querySelector(".badge");

    priceInput.addEventListener("change", () => {
      const value = Number(priceInput.value);
      if (Number.isNaN(value) || value < 0) {
        priceInput.value = product.price;
        return;
      }
      overrides[product.id] = { ...(overrides[product.id] || {}), price: value };
      persistOverrides();
      setDirty(true);
    });

    stockCheckbox.addEventListener("change", () => {
      const nowInStock = !stockCheckbox.checked;
      overrides[product.id] = { ...(overrides[product.id] || {}), inStock: nowInStock };
      persistOverrides();
      setDirty(true);
      tr.classList.toggle("out-of-stock", !nowInStock);
      badge.className = `badge ${nowInStock ? "badge--ok" : "badge--out"}`;
      badge.textContent = nowInStock ? "Em estoque" : "Fora de estoque";
    });

    return tr;
  }

  function renderTable(products) {
    const frag = document.createDocumentFragment();
    products.forEach((p) => {
      const row = buildRow(p);
      rowMap.set(p.id, row);
      frag.appendChild(row);
    });
    tableBody.appendChild(frag);
  }

  function applySearch() {
    const term = normalize(searchInput.value.trim());
    rowMap.forEach((row, id) => {
      if (!term) {
        row.hidden = false;
        return;
      }
      const product = Products.getById(id);
      const haystack = normalize(`${product.name} ${product.brand} ${product.category}`);
      row.hidden = !haystack.includes(term);
    });
  }

  async function saveToFile() {
    if (!window.showSaveFilePicker) {
      alert(
        'Este navegador não suporta salvar o arquivo diretamente. Use "Baixar products.json" e substitua o arquivo manualmente em data/products.json.'
      );
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "products.json",
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(getMergedProducts(), null, 2));
      await writable.close();
      statusEl.textContent = `Salvo em "${handle.name}". Confirme que sobrescreveu vippods-site/data/products.json.`;
      overrides = {};
      persistOverrides();
      dirty = false;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[VIPpods admin] Erro ao salvar arquivo:", err);
        statusEl.textContent = `Erro ao salvar: ${err.message}`;
      }
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(getMergedProducts(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    statusEl.textContent = "Arquivo baixado. Substitua data/products.json no projeto por ele.";
    overrides = {};
    persistOverrides();
    dirty = false;
  }

  async function initPanel() {
    loadOverrides();
    await Products.load();
    let products = Products.getAll();

    if (products.length === 0) {
      loadErrorEl.hidden = false;
      loadErrorEl.textContent = "Não foi possível carregar o catálogo de produtos.";
      return;
    }

    // aplica overrides pendentes (ainda não salvos no arquivo) para exibição
    products = products.map((p) => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p));

    renderTable(products);
    if (Object.keys(overrides).length > 0) {
      setDirty(true);
    }

    searchInput.addEventListener("input", debounce(applySearch, 150));
    saveFileBtn.addEventListener("click", saveToFile);
    downloadBtn.addEventListener("click", downloadJSON);
  }

  function showPanel() {
    loginSection.hidden = true;
    panel.hidden = false;
    initPanel();
  }

  function checkAuth() {
    if (localStorage.getItem(AUTH_KEY) === "1") {
      showPanel();
    }
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (passwordInput.value === CONFIG.ADMIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, "1");
      loginError.style.display = "none";
      showPanel();
    } else {
      loginError.style.display = "block";
    }
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(AUTH_KEY);
    window.location.reload();
  });

  document.addEventListener("DOMContentLoaded", checkAuth);
})();
