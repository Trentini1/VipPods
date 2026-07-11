// Aba Atacado/Revendedor: só um botão pro WhatsApp. Os preços de atacado mudam
// com frequência, então a tabela atualizada é enviada em PDF direto na conversa
// em vez de aparecer aqui no site.
(function () {
  let initialized = false;

  window.initWholesaleTab = function initWholesaleTab() {
    if (initialized) return;
    initialized = true;

    const btn = document.getElementById("wholesale-whatsapp-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const message = `Olá! Quero fazer um pedido no atacado/revenda na ${CONFIG.STORE_NAME}. Pode me mandar a tabela de preços atualizada?`;
      const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener");
    });
  };
})();
