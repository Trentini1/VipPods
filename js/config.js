// Configuração central da loja. Ajuste estes valores conforme necessário.
const CONFIG = {
  STORE_NAME: "VIPpods",

  // Número de WhatsApp para onde os pedidos são enviados (formato internacional, só dígitos).
  // Exemplo: 55 (Brasil) + DDD + número
  WHATSAPP_NUMBER: "5541996907011",

  // A taxa de entrega não é fixa — é sempre combinada com o cliente pelo
  // WhatsApp depois do pedido (ver aviso "+ taxa de entrega" nos produtos
  // e a mensagem de checkout em cart.js/wholesale.js).

  CURRENCY_LOCALE: "pt-BR",
  CURRENCY: "BRL",

  // E-mail da conta de administrador cadastrada no Firebase Authentication.
  // A senha NÃO fica mais aqui: crie esse usuário em
  // Firebase Console > Authentication > Sign-in method > Email/senha > Add user,
  // com o e-mail abaixo e a senha que você quiser usar pra entrar no /admin.html.
  ADMIN_EMAIL: "admin@vippods.app",

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
