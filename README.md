# VIPpods - Marketplace

Site de catálogo e vendas VIPpods.

## Estrutura de pastas

vippods-site/
├── index.html            -> página principal (catálogo público)
├── admin.html            -> painel admin (preço / estoque), protegido por senha simples
├── css/
│   └── style.css         -> estilos do site (dark theme, responsivo 320-768px+)
├── js/
│   ├── config.js         -> constantes (WhatsApp, nome da loja, frete, senha admin)
│   ├── products-data.js  -> cópia embutida dos produtos (fallback offline/file://)
│   ├── products.js       -> carregamento dos produtos (fetch com fallback)
│   ├── cart.js           -> lógica do carrinho e checkout via WhatsApp
│   ├── main.js           -> busca, filtros, ordenação e render do grid
│   └── admin.js          -> lógica do painel admin
├── data/
│   └── products.json     -> catálogo de produtos (555 itens - ATUALMENTE PLACEHOLDER)
├── assets/
│   ├── img/               -> fotos de produtos, banners
│   └── icons/              -> ícones/logo
└── docs/                  -> anotações, catálogo em PDF, etc.

> **Catálogo placeholder:** `data/products.json` e `js/products-data.js` contêm
> 555 produtos de exemplo gerados automaticamente (marcas/sabores fictícios),
> só para desenvolver e testar a busca/filtros/carrinho com volume real.
> Substitua ambos os arquivos pelo catálogo real quando disponível — e mantenha
> os dois em sincronia, já que `products-data.js` é o fallback usado quando o
> site é aberto direto como `file://` (sem servidor).

## Como rodar localmente

Funciona das duas formas:

- Abrindo `index.html` direto no navegador (usa o catálogo embutido em `products-data.js`).
- Rodando um servidor local (usa `data/products.json` via fetch, mais fácil de editar):

      python3 -m http.server 8000

  Depois acesse http://localhost:8000

## Painel admin

Acesse `admin.html`, senha padrão definida em `js/config.js` (`ADMIN_PASSWORD`).
Permite editar preço e marcar produtos como fora de estoque (somem do catálogo
público). Não escreve no disco automaticamente — no Chrome/Edge, "Salvar em
data/products.json" abre um seletor de arquivo (aponte para o `data/products.json`
do projeto); em outros navegadores, use "Baixar products.json" e substitua o
arquivo manualmente. Isso não é autenticação real, apenas uma barreira simples.

## Deploy

Vercel ou Netlify, apontando pra este repositório (privado).
