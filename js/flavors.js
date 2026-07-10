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

  // Algumas fichas de produto vêm em inglês (nome original do fornecedor),
  // então cada regra também reconhece a palavra equivalente em inglês.
  RULES: [
    [/gelo|gelad[ao]|\bice\b/, "ice"],
    [/\bmenta\b|\bmint\b/, "ice"],
    [/melancia|morango|cereja|framboesa|frutas vermelhas|watermelon|strawberry|cherry|raspberry/, "vermelha"],
    [/abacaxi|banana|manga|maracuja|coco|pessego|tropical|pineapple|mango|passion|coconut|peach/, "tropical"],
    [/limao|maca verde|kiwi|lemon|green apple|\blime\b/, "citrico"],
    [/\buva\b|amora|blue razz|groselha|\bgrape\b|blackberry/, "uva"],
    [/baunilha|chiclete|lichia|vanilla|bubblegum|lychee/, "doce"],
    [/energetico|energy drink|\benergy\b/, "energetico"],
    [/tabaco|tobacco/, "tabaco"],
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
