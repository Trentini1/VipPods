// Mapeamento sabor -> familia de cor. Lido a partir do campo estruturado
// `flavor` (mais confiavel que regex em `name`); `name` só entra como reforço
// quando `flavor` vem vazio. Dicionário validado contra os 555 produtos reais
// em SABORES.md — qualquer ajuste na regra deve ser refeito lá também.
const Flavors = {
  FAMILIES: [
    { key: "ice", label: "Ice" },
    { key: "vermelha", label: "Vermelha" },
    { key: "tropical", label: "Tropical" },
    { key: "citrico", label: "Cítrico" },
    { key: "uva", label: "Uva" },
    { key: "doce", label: "Doce" },
    { key: "energetico", label: "Energético" },
    { key: "tabaco", label: "Tabaco" },
    { key: "neutro", label: "Acessórios" },
  ],

  RULES: [
    [/gelo|gelad[ao]/, "ice"],
    [/\bmenta\b/, "ice"],
    [/melancia|morango|cereja|framboesa|frutas vermelhas/, "vermelha"],
    [/abacaxi|banana|manga|maracuja|coco|pessego|tropical/, "tropical"],
    [/limao|maca verde|kiwi/, "citrico"],
    [/\buva\b|amora|blue razz|groselha/, "uva"],
    [/baunilha|chiclete|lichia/, "doce"],
    [/energetico/, "energetico"],
    [/tabaco/, "tabaco"],
  ],

  normalize(text) {
    return (text || "")
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  },

  getFamily(product) {
    let text = this.normalize(product.flavor);
    if (!text) text = this.normalize(product.name);
    for (const [regex, family] of this.RULES) {
      if (regex.test(text)) return family;
    }
    return "neutro";
  },
};
