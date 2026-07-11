// Painel admin — seção Extras. Segunda seção manual, igual a Perfumes mas em
// outro caminho do Firebase (extras / settings/extrasLabel), pra o dono da
// loja manter duas vitrines cadastradas à mão ao mesmo tempo.
(function () {
  const PATH = "extras";
  const LABEL_PATH = "settings/extrasLabel";
  const DEFAULT_LABEL = "Extras";

  const form = document.getElementById("extra-form");
  const nameInput = document.getElementById("extra-name");
  const priceInput = document.getElementById("extra-price");
  const descInput = document.getElementById("extra-description");
  const photoInput = document.getElementById("extra-photo");
  const listEl = document.getElementById("extra-admin-list");
  const emptyEl = document.getElementById("extra-admin-empty");
  const labelForm = document.getElementById("extra-label-form");
  const labelInput = document.getElementById("extra-label-input");

  if (!form || !listEl) return;

  let items = {};

  async function loadLabel() {
    if (!labelInput) return;
    try {
      const snap = await firebaseDb.ref(LABEL_PATH).once("value");
      const value = snap.val();
      labelInput.value = typeof value === "string" && value.trim() ? value.trim() : DEFAULT_LABEL;
    } catch (err) {
      console.warn("[VIPpods admin] Não foi possível carregar o nome da aba.", err);
      labelInput.value = DEFAULT_LABEL;
    }
  }

  if (labelForm) {
    labelForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = labelInput.value.trim() || DEFAULT_LABEL;
      labelInput.value = value;
      firebaseDb
        .ref(LABEL_PATH)
        .set(value)
        .then(() => alert(`Nome salvo! A aba agora aparece como "${value}" no site.`))
        .catch((err) => {
          console.error("[VIPpods admin] Não foi possível salvar o nome da aba:", err);
          alert("Não foi possível salvar. Verifique sua conexão.");
        });
    });
  }

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

  async function loadExtras() {
    try {
      const snap = await firebaseDb.ref(PATH).once("value");
      items = snap.val() || {};
    } catch (err) {
      console.warn("[VIPpods admin] Não foi possível carregar os extras.", err);
      items = {};
    }
  }

  function updateExtra(id, patch) {
    items[id] = { ...(items[id] || {}), ...patch };
    firebaseDb
      .ref(`${PATH}/${id}`)
      .update(patch)
      .catch((err) => {
        console.error("[VIPpods admin] Não foi possível salvar o item:", err);
        alert("Não foi possível salvar essa alteração no Firebase. Verifique sua conexão.");
      });
  }

  function removeExtra(id) {
    if (!confirm("Remover esse item da loja?")) return;
    delete items[id];
    firebaseDb
      .ref(`${PATH}/${id}`)
      .remove()
      .catch((err) => console.error("[VIPpods admin] Não foi possível remover o item:", err));
    renderList();
  }

  function buildRow(id, extra) {
    const row = document.createElement("div");
    row.className = "perfume-admin-row";
    const active = extra.inStock !== false;
    row.innerHTML = `
      <img class="admin-thumb perfume-admin-row__thumb" src="${extra.image || "assets/img/placeholder.svg"}" alt="">
      <input type="file" accept="image/*" class="photo-input perfume-admin-row__photo" aria-label="Trocar foto de ${extra.name}">
      <div class="perfume-admin-row__fields">
        <input type="text" class="perfume-admin-row__name" value="${extra.name || ""}" aria-label="Nome do item">
        <input type="number" min="0" step="0.01" class="perfume-admin-row__price" value="${extra.price ?? 0}" aria-label="Preço do item">
        <textarea rows="2" class="perfume-admin-row__desc" aria-label="Descrição do item">${extra.description || ""}</textarea>
        <label class="perfume-admin-row__active">
          <input type="checkbox" ${active ? "checked" : ""} class="perfume-admin-row__active-cb">
          Ativo (visível na loja)
        </label>
      </div>
      <button type="button" class="btn perfume-admin-row__remove" style="background: var(--surface-elevated); color: var(--danger);">Remover</button>
    `;

    row.querySelector(".perfume-admin-row__name").addEventListener("change", (e) => {
      updateExtra(id, { name: e.target.value.trim() });
    });
    row.querySelector(".perfume-admin-row__price").addEventListener("change", (e) => {
      const value = Number(e.target.value);
      updateExtra(id, { price: Number.isNaN(value) || value < 0 ? 0 : value });
    });
    row.querySelector(".perfume-admin-row__desc").addEventListener("change", (e) => {
      updateExtra(id, { description: e.target.value.trim() });
    });
    row.querySelector(".perfume-admin-row__active-cb").addEventListener("change", (e) => {
      updateExtra(id, { inStock: e.target.checked });
    });
    row.querySelector(".perfume-admin-row__remove").addEventListener("click", () => removeExtra(id));
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
        updateExtra(id, { image: dataUrl });
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
        alert("Não foi possível processar essa imagem, o item será salvo sem foto.");
      }
    }

    const newRef = firebaseDb.ref(PATH).push();
    const extra = {
      name,
      description: descInput.value.trim(),
      price,
      image,
      inStock: true,
      createdAt: Date.now(),
    };

    try {
      await newRef.set(extra);
      items[newRef.key] = extra;
      renderList();
      form.reset();
    } catch (err) {
      console.error("[VIPpods admin] Não foi possível salvar o item:", err);
      alert("Não foi possível salvar esse item no Firebase. Verifique sua conexão.");
    }
  });

  let started = false;
  firebaseAuth.onAuthStateChanged(async (user) => {
    if (!user || started) return;
    started = true;
    await Promise.all([loadExtras(), loadLabel()]);
    renderList();
  });
})();
