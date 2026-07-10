// Carregamento e acesso ao catálogo de produtos.
// Tenta buscar data/products.json (funciona quando servido via http://).
// Se falhar (ex: aberto direto como file://, ou o arquivo não existe/está inválido),
// cai para o catálogo embutido em js/products-data.js, que sempre funciona offline.
const Products = {
  items: [],
  source: null, // 'fetch' | 'embedded'

  async load() {
    try {
      const response = await fetch("data/products.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("JSON de produtos vazio ou em formato inválido");
      }
      this.items = data;
      this.source = "fetch";
    } catch (err) {
      console.warn(
        "[VIPpods] Não foi possível carregar data/products.json via fetch " +
          `(${err.message}). Usando catálogo local embutido em products-data.js. ` +
          "Isso é esperado ao abrir o index.html direto no navegador (file://); " +
          "rode 'python3 -m http.server' para carregar o JSON externo.",
        err
      );
      this.items = typeof PRODUCTS_EMBEDDED !== "undefined" ? PRODUCTS_EMBEDDED : [];
      this.source = "embedded";
    }

    await this.applyRemoteOverrides();
    return this.items;
  },

  // Aplica por cima do catálogo base as alterações feitas no painel admin
  // (preço, custo, estoque, foto), que ficam salvas no Firebase e valem
  // pra todo mundo que visita o site, não só pra quem editou.
  async applyRemoteOverrides() {
    if (typeof window.firebaseDb === "undefined") return;
    try {
      const snap = await firebaseDb.ref("overrides").once("value");
      const overrides = snap.val() || {};
      this.items = this.items.map((p) => {
        const ov = overrides[p.id];
        return ov ? { ...p, ...ov } : p;
      });
    } catch (err) {
      console.warn(
        "[VIPpods] Não foi possível carregar as atualizações do Firebase, exibindo catálogo local.",
        err
      );
    }
  },

  getAll() {
    return this.items;
  },

  getAvailable() {
    return this.items.filter((p) => p.inStock);
  },

  getById(id) {
    return this.items.find((p) => p.id === id);
  },
};
