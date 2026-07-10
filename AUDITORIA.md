# Auditoria — VIPpods (antes de qualquer CSS novo)

Escopo lido: `index.html`, `css/style.css` (962 linhas), `js/main.js`, `js/cart.js`,
`js/wholesale.js`, `js/products.js`, `js/config.js`, `data/products.json` (555
produtos), `js/products-data.js` (cópia embutida, gerada a partir do JSON).

**Fora de escopo assumido:** `admin.html` / `js/admin.js` — é ferramenta interna,
não é a experiência do cliente no celular. Não vou mexer nele nesta reforma a
menos que você peça. Me avise se quiser incluir.

---

## Como os dados funcionam hoje (pra eu não inventar nada)

- Produto: `{ id, name, brand, category, flavor, puffs, price, image, inStock,
  description, costUSD, wholesalePrice, featured }`. Vem de `data/products.json`
  via `fetch`, com fallback pra `js/products-data.js` embutido quando é aberto
  como `file://`. **Os dois precisam continuar sincronizados** — não vou gerar
  um terceiro formato.
- `category` tem 4 valores fixos: `Descartável`, `Pod Recarregável`,
  `Refil/Cápsula`, `Acessório`.
- `brand`: 16 marcas (`Oxbar`, `Ignite`, `Elf Bar`, `Lost Mary`, `Geek Bar`,
  `Vozol`, `Waka`, `Hyppe`, `Fume`, `Puff Bar`, `Tugboat`, `Randm`, `Nasty Bar`,
  `Aroma King`, `VaporEsse`, `Uwell Caliburn`) — 14 mencionadas no briefing, 16
  reais nos dados.
- `flavor`: **já é um campo estruturado**, não precisa de regex em cima do nome.
  31 valores distintos (`Melancia`, `Melancia com Gelo`, `Morango`, `Morango com
  Gelo`, `Menta`, `Menta Gelada`, `Uva`, `Manga`, `Tabaco Clássico`,
  `Energético`, etc.), mais 12 produtos (acessórios, na maioria) com `flavor`
  vazio. Isso muda o plano da Fase 1: mapear pra família de cor pelo `flavor`
  estruturado é mais confiável do que ler o `name` — vou fazer os dois (dado
  primeiro, nome como reforço) e documentar em `SABORES.md`.
- Busca (`js/main.js` e `js/wholesale.js`, função `normalize` + `getFiltered`):
  normaliza acento/caixa e faz `String.includes` em
  `nome + marca + sabor`. **555 itens, sem Fuse.js, exatamente como o
  briefing pede.** Isso já está certo, não precisa trocar a lógica — só a UI.
- Filtro atual: só `category` e `brand` (dois `<select>` nativos). **Não existe
  filtro por sabor hoje**, apesar do dado existir em 100% dos produtos
  aplicáveis — ver problema de UX #3 abaixo.
- Carrinho varejo (`Cart`, `js/cart.js`) e carrinho atacado (`WholesaleCart`,
  `js/wholesale.js`) são objetos **separados**, cada um com sua chave de
  `localStorage` (`vippods_cart` / `vippods_wholesale_cart`) e seu próprio
  `buildWhatsAppMessage()`. Preciso preservar os dois formatos de mensagem
  exatamente como estão (Fase 8 do plano).
- Mensagem do WhatsApp: monta texto simples (`Olá! Quero fazer um pedido...`,
  lista `• {qty}x {nome} - {preço}`, subtotal/frete/total) e abre
  `https://wa.me/{numero}?text={encoded}`. Isso **não muda**.
- **Catálogo é placeholder** (confirmado no `README.md` e nos dados): as 555
  fotos apontam, sem exceção, para o mesmo arquivo —
  `assets/img/placeholder.svg`. Ver nota crítica abaixo.

### Nota crítica que muda o cálculo da Fase 1

Como as 555 fotos são idênticas hoje, **a cor do sabor não é só estilo — é a
única coisa que vai diferenciar visualmente um card do outro** até vocês
subirem fotos reais. Isso valida (e endurece) a tese do Espectro: sem ela, o
grid inteiro é o mesmo cartão SVG repetido 555 vezes com texto trocando por
baixo. Vou tratar isso como requisito funcional, não decoração.

---

## Os 5 piores problemas de UX (ordem de impacto no polegar)

1. **Trocar de aba reseta o scroll.** `activateTab()` chama
   `window.scrollTo(0, 0)` incondicionalmente (`js/main.js:272`). Alguém rola a
   grade de 555 produtos, espia o carrinho pra conferir o total, volta pra
   Produtos — e a lista volta pro topo. Isso pune exatamente o comportamento
   que eu quero incentivar (comparar, voltar, continuar comprando).

2. **O dado que mais importa pra decisão (sabor) não é filtrável.** A barra de
   filtros só tem `category` e `brand` (`index.html:46-62`). Pra achar
   "melancia gelada" o cliente depende de digitar a palavra certa na busca e
   torcer pra bater no nome do produto. O campo `flavor` existe pronto em
   543 dos 555 produtos e não vira nem select, nem chip, nem nada clicável.

3. **Alvos de toque abaixo de 44px na área de compra inteira.** `.qty-btn` é
   26×26px (`css/style.css:594-596`, usado no carrinho e repetido a 30×34px no
   atacado); o botão "Adicionar ao carrinho" do card resulta em ~38px de altura
   real (`.btn` com padding `9px 12px` e `font-size 0.9rem`,
   `css/style.css:347-354`); o botão de remover item do carrinho é um emoji 🗑
   sem `width`/`height`/`padding` definidos (`css/style.css:659-667`). Em rua,
   andando, com a tela suja, são três formas diferentes de errar o toque na
   mesma tela.

4. **Barra de filtros sem hierarquia, quebra imprevisível em 390px.** Um
   `<input search>` + 3 `<select>` dividem um `flex-wrap` sem prioridade
   (`css/style.css:227-245`, `flex: 1 1 140px` igual pra todo mundo). Em tela
   estreita eles quebram linha em combinações diferentes dependendo do
   conteúdo do select (nome de marca/categoria mais longo empurra o próximo
   pra baixo) — o layout muda dependendo de qual filtro tem o texto mais
   comprido, não por decisão de design.

5. **Dots do carrossel de destaque são o único atalho direto e medem 8×8px**
   (`css/style.css:503-511`, `.carousel__dot`). As setas ao lado são 36×36px
   (`css/style.css:470-476`) — ainda abaixo do ideal, mas pelo menos clicáveis.
   Os dots são o menor alvo interativo real de toda a interface.

---

## Os 5 piores problemas visuais (o pecado, nomeado)

1. **Fonte default do sistema.** `font-family: "Segoe UI", Roboto, Helvetica,
   Arial, sans-serif` (`css/style.css:40`) — é a pilha de fallback de qualquer
   formulário corporativo não estilizado. Zero ponto de vista tipográfico.

2. **Accent único fazendo o trabalho de cinco cores.** `--accent: #5865f2`
   (`css/style.css:15`) — quase o azul do Discord/Blurple — é usado em link,
   foco, categoria do carrossel, dot ativo do carrossel, borda do tab ativo do
   admin e badge do "atacado". Quando a mesma cor marca "isto é um link", "isto
   está em foco" e "isto é a categoria", nenhuma delas comunica nada sozinha.

3. **Elevação inconsistente — só um elemento "flutua" no app inteiro.** Existe
   exatamente uma sombra real, `box-shadow: 0 -2px 10px rgba(0,0,0,.25)` na
   bottom-nav (`css/style.css:168`). Todo o resto — cards, carrossel, banner de
   atacado — usa só `border: 1px solid var(--border)`. A hierarquia de
   profundidade da tela é arbitrária: a barra de navegação tem peso físico, o
   card do produto não.

4. **Espaçamento sem escala.** Padding usado no arquivo: 3px, 4px, 6px, 8px,
   9px, 10px, 12px, 14px, 16px, 18px, 20px, 24px — todos concorrendo em
   componentes vizinhos (`.btn` é `9px 12px`, `.filters-bar select` é
   `9px 10px`, `.pricing-panel` é `16px`, `.admin-table td` é `10px 12px`).
   Nenhum número se repete por sistema; cada componente inventou o próprio.

5. **Três sistemas de arredondamento coexistindo sem regra.** `--radius: 12px`
   e `--radius-sm: 8px` convivem com `border-radius: 50%` (dots, setas do
   carrossel) e `border-radius: 999px` (badges, contador do carrinho) —
   quadrado-arredondado, circular e pílula aparecem lado a lado sem critério
   visível de quando usar qual.

---

## Onde o código anima `height`, `top`, `box-shadow` ou `background-position`

**Nenhum lugar.** Busquei `transition`, `animation`, `@keyframes` em
`css/style.css` inteiro: existem só 3 seletores com `:hover`
(`.btn--primary:hover`, `.btn--ghost:hover`, `.checkout-btn:hover`,
`css/style.css:361,371,709`) e **nenhum tem `transition` declarada** — a
mudança de cor no hover é instantânea (sem easing). Não há `@keyframes` no
projeto. Em JS, o único movimento é `track.scrollTo({ behavior: "smooth" })`
no carrossel (`js/main.js:219,225` etc.) — scroll nativo do browser, não uma
animação custom de layout.

Ou seja: não tem nada pra "matar" nesse sentido — mas também não existe
**nenhum** feedback de movimento hoje. Toda a tabela de motion da Fase 6 em
diante é construída do zero, não substituindo animação ruim.

---

Aguardando sua confirmação pra seguir pra Fase 1 (`PLANO.md` + `SABORES.md`).
