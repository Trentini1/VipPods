// Painel admin — seção Perfumes. Catálogo pequeno e cadastrado à mão, à parte
// da tabela de pods (que vem do data/products.json + overrides). Cada perfume
// vive direto em Firebase > perfumes/<id gerado>, sem custo/atacado/estoque em
// lote — só nome, descrição, preço, foto e um "ativo" pra tirar da vitrine
// sem precisar apagar.
(function () {
  const PATH = "perfumes";

  const form = document.getElementById("perfume-form");
  const nameInput = document.getElementById("perfume-name");
  const priceInput = document.getElementById("perfume-price");
  const descInput = document.getElementById("perfume-description");
  const photoInput = document.getElementById("perfume-photo");
  const listEl = document.getElementById("perfume-admin-list");
  const emptyEl = document.getElementById("perfume-admin-empty");

  if (!form || !listEl) return;

  let items = {};

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

  async function loadPerfumes() {
    try {
      const snap = await firebaseDb.ref(PATH).once("value");
      items = snap.val() || {};
    } catch (err) {
      console.warn("[VIPpods admin] Não foi possível carregar os perfumes.", err);
      items = {};
    }
  }

  function updatePerfume(id, patch) {
    items[id] = { ...(items[id] || {}), ...patch };
    firebaseDb
      .ref(`${PATH}/${id}`)
      .update(patch)
      .catch((err) => {
        console.error("[VIPpods admin] Não foi possível salvar o perfume:", err);
        alert("Não foi possível salvar essa alteração no Firebase. Verifique sua conexão.");
      });
  }

  function removePerfume(id) {
    if (!confirm("Remover esse perfume da loja?")) return;
    delete items[id];
    firebaseDb
      .ref(`${PATH}/${id}`)
      .remove()
      .catch((err) => console.error("[VIPpods admin] Não foi possível remover o perfume:", err));
    renderList();
  }

  function buildRow(id, perfume) {
    const row = document.createElement("div");
    row.className = "perfume-admin-row";
    const active = perfume.inStock !== false;
    row.innerHTML = `
      <img class="admin-thumb perfume-admin-row__thumb" src="${perfume.image || "assets/img/placeholder.svg"}" alt="">
      <input type="file" accept="image/*" class="photo-input perfume-admin-row__photo" aria-label="Trocar foto de ${perfume.name}">
      <div class="perfume-admin-row__fields">
        <input type="text" class="perfume-admin-row__name" value="${perfume.name || ""}" aria-label="Nome do perfume">
        <input type="number" min="0" step="0.01" class="perfume-admin-row__price" value="${perfume.price ?? 0}" aria-label="Preço do perfume">
        <textarea rows="2" class="perfume-admin-row__desc" aria-label="Descrição do perfume">${perfume.description || ""}</textarea>
        <label class="perfume-admin-row__active">
          <input type="checkbox" ${active ? "checked" : ""} class="perfume-admin-row__active-cb">
          Ativo (visível na loja)
        </label>
      </div>
      <button type="button" class="btn perfume-admin-row__remove" style="background: var(--surface-elevated); color: var(--danger);">Remover</button>
    `;

    row.querySelector(".perfume-admin-row__name").addEventListener("change", (e) => {
      updatePerfume(id, { name: e.target.value.trim() });
    });
    row.querySelector(".perfume-admin-row__price").addEventListener("change", (e) => {
      const value = Number(e.target.value);
      updatePerfume(id, { price: Number.isNaN(value) || value < 0 ? 0 : value });
    });
    row.querySelector(".perfume-admin-row__desc").addEventListener("change", (e) => {
      updatePerfume(id, { description: e.target.value.trim() });
    });
    row.querySelector(".perfume-admin-row__active-cb").addEventListener("change", (e) => {
      updatePerfume(id, { inStock: e.target.checked });
    });
    row.querySelector(".perfume-admin-row__remove").addEventListener("click", () => removePerfume(id));
    row.querySelector(".perfume-admin-row__photo").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Selecione um arquivo de imagem válido.");
        e.target.value = "";
        return;
      }
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        updatePerfume(id, { image: dataUrl });
        row.querySelector(".perfume-admin-row__thumb").src = dataUrl;
      } catch (err) {
        console.error("[VIPpods admin] Erro ao processar imagem:", err);
        alert("Não foi possível processar essa imagem.");
      } finally {
        e.target.value = "";
      }
    });

    return row;
  }

  function renderList() {
    const ids = Object.keys(items);
    listEl.innerHTML = "";
    if (ids.length === 0) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    const frag = document.createDocumentFragment();
    ids.forEach((id) => frag.appendChild(buildRow(id, items[id])));
    listEl.appendChild(frag);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    if (!name || Number.isNaN(price) || price < 0) return;

    let image = "";
    const file = photoInput.files[0];
    if (file) {
      try {
        image = await resizeImageToDataUrl(file);
      } catch (err) {
        console.error("[VIPpods admin] Erro ao processar imagem:", err);
        alert("Não foi possível processar essa imagem, o perfume será salvo sem foto.");
      }
    }

    const newRef = firebaseDb.ref(PATH).push();
    const perfume = {
      name,
      description: descInput.value.trim(),
      price,
      image,
      inStock: true,
      createdAt: Date.now(),
    };

    try {
      await newRef.set(perfume);
      items[newRef.key] = perfume;
      renderList();
      form.reset();
    } catch (err) {
      console.error("[VIPpods admin] Não foi possível salvar o perfume:", err);
      alert("Não foi possível salvar esse perfume no Firebase. Verifique sua conexão.");
    }
  });

  let started = false;
  firebaseAuth.onAuthStateChanged(async (user) => {
    if (!user || started) return;
    started = true;
    await loadPerfumes();
    renderList();
  });
})();
