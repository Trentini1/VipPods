# VIPpods - Marketplace

Site de catálogo e vendas VIPpods.

## Estrutura de pastas

Tudo direto na raiz do repositório (sem subpasta), pra funcionar de cara em
qualquer hospedagem estática que sirva a partir da raiz (GitHub Pages, Vercel,
Netlify):

├── index.html            -> página principal, app de abas (Início / Produtos / Atacado / Carrinho)
├── admin.html            -> painel admin (preço / custo / estoque / fotos), protegido por senha simples
├── css/
│   └── style.css         -> estilos do site (dark theme, responsivo 320-768px+, bottom nav estilo app)
├── js/
│   ├── config.js         -> constantes (WhatsApp, nome da loja, frete, senha admin, precificação padrão)
│   ├── products-data.js  -> cópia embutida dos produtos (fallback offline/file://)
│   ├── products.js       -> carregamento dos produtos (fetch com fallback)
│   ├── cart.js           -> lógica do carrinho varejo e checkout via WhatsApp
│   ├── wholesale.js      -> catálogo e carrinho da aba Atacado (mínimo de unidades, checkout próprio)
│   ├── main.js           -> navegação em abas, carrossel de destaques, busca/filtros/ordenação do catálogo
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

## Navegação do site (estilo app)

O catálogo público é um app de página única com navegação fixa embaixo, pensado
pra celular:

- **Início** — carrossel com até 3 produtos marcados como destaque no admin.
- **Produtos** — catálogo completo, com busca, filtro de categoria/marca e ordenação.
- **Atacado** — mesmos produtos com preço de atacado (`wholesalePrice`), seletor
  de quantidade por produto e checkout próprio via WhatsApp. Só libera o botão
  de finalizar quando o total de unidades (somando produtos diferentes) atinge
  `CONFIG.WHOLESALE_MIN_QTY` (50 por padrão, ajustável em `js/config.js`).
- **Carrinho** — carrinho de varejo, agora como aba fixa em vez de gaveta.

## Painel admin

Acesse `admin.html` (tem um link "Acesso admin" no rodapé do catálogo), senha
padrão definida em `js/config.js` (`ADMIN_PASSWORD`). Permite:

- Editar preço, custo em dólar e preço de atacado por produto, e marcar
  produtos como fora de estoque (somem do catálogo público e vão pra uma aba
  separada "Fora de estoque" dentro do próprio admin, com busca própria).
- **Marcar todos fora de estoque** de uma vez (com confirmação) — útil pra
  esvaziar o catálogo rapidamente, por exemplo em caso de ruptura de estoque geral.
- **Calculadora de preço**: dois painéis (Varejo e Atacado), cada um com
  cotação do dólar + margem em R$. Preço final = (custo em US$ × cotação) +
  margem, calculado individualmente pro custo de cada produto quando você
  clica em "Aplicar a todos os produtos". As cotações/margens ficam salvas no
  navegador entre sessões.
- Trocar a foto do produto: a imagem enviada é redimensionada/comprimida no
  navegador e embutida como base64 direto no campo `image` do produto (não
  precisa de servidor/backend). Isso deixa o `products.json` mais pesado quanto
  mais fotos forem trocadas — se o navegador acusar que o localStorage encheu,
  clique em "Baixar products.json" imediatamente pra não perder as edições.

Nada disso escreve no disco automaticamente — no Chrome/Edge, "Salvar em
data/products.json" abre um seletor de arquivo (aponte para o `data/products.json`
do projeto); em outros navegadores, use "Baixar products.json" e substitua o
arquivo manualmente. Isso não é autenticação real, apenas uma barreira simples.

## Deploy

Vercel ou Netlify, apontando pra este repositório (privado).
