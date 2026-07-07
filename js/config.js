// Configuração central da loja. Ajuste estes valores conforme necessário.
const CONFIG = {
  STORE_NAME: "VIPpods",

  // Número de WhatsApp para onde os pedidos são enviados (formato internacional, só dígitos).
  // Exemplo: 55 (Brasil) + DDD + número
  WHATSAPP_NUMBER: "5511999999999",

  // Taxa de frete fixa aplicada ao pedido (em R$). Use 0 para não cobrar frete.
  SHIPPING_FEE: 0,

  // Valor mínimo do pedido para frete grátis (null desativa a regra)
  FREE_SHIPPING_MIN: 200,

  CURRENCY_LOCALE: "pt-BR",
  CURRENCY: "BRL",

  // Senha simples do painel admin (NÃO é segurança real, só evita acesso casual).
  ADMIN_PASSWORD: "vippods2026",

  // Quantidade mínima total (somando todos os produtos) pra fechar pedido no atacado.
  WHOLESALE_MIN_QTY: 50,

  // Valores padrão da calculadora de preço do admin (cotação do dólar + margem em R$).
  // O admin pode ajustar e reaplicar a qualquer momento; isso aqui é só o valor inicial.
  DEFAULT_PRICING: {
    retailRate: 5.2,
    retailMarkup: 15,
    wholesaleRate: 5.2,
    wholesaleMarkup: 7,
  },
};

// Preço final = (custo em US$ × cotação do dólar) + margem em R$.
function calcPrice(costUSD, rate, markup) {
  const value = Number(costUSD) * Number(rate) + Number(markup);
  return Math.round(value * 100) / 100;
}
