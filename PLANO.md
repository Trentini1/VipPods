# Plano — VIPpods redesign (Fase 1)

Tese: **a interface é o chassi, o líquido é a cor.** Tudo abaixo existe pra
executar isso como estrutura, não como decoração em cima do site atual.

---

## Paleta final

Adoto os tokens do briefing **exatamente como vieram** — são 6 cinzas, e todo
componente que desenhei abaixo cabe neles sem precisar de um sétimo:

| Token | Uso |
|---|---|
| `--gelo` `#F4F5F6` | fundo de app (substitui o `--bg` escuro atual) |
| `--branco` `#FFFFFF` | superfície de card, sheet, header |
| `--aluminio` `#DDE0E4` | borda padrão (substitui `--border`) |
| `--aluminio-2` `#EDEFF1` | fundo de input, chip inativo, skeleton |
| `--grafite-500` | texto secundário, ícone inativo |
| `--grafite-900` | texto primário, Barra LED, texto sobre `--sabor` |

As 9 cores de sabor (`ice/vermelha/tropical/citrico/uva/doce/energetico/
tabaco/neutro`) são as únicas cores saturadas da tela inteira. Mapeamento
completo dos 555 produtos reais em `SABORES.md`.

**Risco assumido:** matar o `--accent` roxo-azulado (`#5865f2`) que hoje marca
"link", "foco", "categoria" e "dot ativo" ao mesmo tempo. Sem accent fixo, foco
de teclado (`:focus-visible`) passa a usar `--grafite-900` sólido — é uma cor
"neutra" fazendo o trabalho que antes era de uma cor de marca. Assumo esse
risco porque é exatamente o ponto da tese: se eu deixasse um accent global
"de segurança", a cor do sabor deixaria de ser a única cor saturada e a
promessa do Espectro furaria.

---

## Pares tipográficos

| Papel | Fonte | Onde |
|---|---|---|
| Display | Archivo Expanded 600/700 | título do sheet, nome no card grande, `display-1/2` |
| Texto/UI | Public Sans 400/500/600 | nome de card, labels, botões, corpo |
| Dado | Martian Mono 500/600 tabular | puffs, mg, ml, preço, contador da Barra LED |

Escala fixa conforme a tabela do briefing (32/24/18/15/14/12/11/16px) — não
escala com viewport, porque o alvo é um device físico (390×844), não uma
faixa de tela.

**Risco assumido:** três famílias de fonte custom (nenhuma é Inter) custam
peso e uma consulta de rede extra num alvo de Android de entrada em 4G. Mitigo
com `font-display: swap`, subset latin-only, e carrego só os pesos realmente
usados (Archivo Expanded 600/700, Public Sans 400/500/600, Martian Mono
500/600 — 7 arquivos woff2, não a família inteira). Aceito esse custo porque é
o gesto tipográfico central da marca (largo × estreito no mesmo card); a
alternativa "mais segura" seria system-font, que é exatamente o pecado #1 que
a Auditoria apontou.

---

## Decisões de estrutura (além de estilo — preciso da sua confirmação nestas)

### 1. O que substitui os 2 `<select>` de categoria/marca

O briefing só descreve o Espectro (sabor) e o rail de marca. Categoria não é
mencionada, mas existe no dado real (4 valores) e hoje é um `<select>`. Minha
decisão: categoria vira um **segmented control de 4 pílulas** (não uma cor,
não compete com o Espectro), porque só 4 valores cabem sem scroll em 390px e é
uma escolha mutuamente exclusiva — diferente do rail de marca (16 valores,
precisa de scroll) e do Espectro (9 swatches, é o filtro primário).

Isso substitui os **dois** `<select>` nativos (categoria e marca) por
controles próprios (`role="group"`, cada opção um `<button aria-pressed>`).
Ganho: resolve o problema de UX #4 da auditoria (barra sem hierarquia,
quebra imprevisível). Custo: perco o comportamento nativo de acessibilidade
do `<select>` e preciso reimplementar teclado/foco nos três controles (já é
mandato do briefing pro Espectro — só estendo o mesmo padrão pros outros
dois).

### 2. O que acontece com a aba Início (o banner de carrossel morre)

O briefing veta banner e diz que o Espectro é o herói — mas não existe banner
hoje só na Produtos, existe na aba **Início** (carrossel de 3 destaques com
gradiente, `linear-gradient(160deg,...)`, vetado por "gradiente decorativo
em qualquer lugar"). Decisão: a aba Início some como conceito de "banner" e
vira a **mesma vitrine do Espectro**, só que compacta:

- Espectro (sabor) — idêntico ao da aba Produtos, é o mesmo componente e o
  mesmo estado (tocar um swatch aqui já filtra e leva pra Produtos).
- Mini-rail "Em destaque" — os 3 produtos com `featured: true`, como cards
  pequenos normais (mesmo componente do grid, sem gradiente, sem slide
  full-bleed).
- CTA "Ver catálogo completo" → aba Produtos.

Mantenho as 4 abas da bottom nav (não vou remover "Início" — seria mudança de
IA que ninguém pediu). Só o *conteúdo* da aba muda, porque o conteúdo antigo
era literalmente o componente vetado pelo briefing.

### 3. Barra LED existe só no carrinho varejo, não no atacado

O atacado já tem um resumo fixo próprio (total de unidades, valor, aviso de
mínimo, botão de checkout) com uma regra de negócio que a Barra LED não
carrega (gate de quantidade mínima). Decisão: a Barra LED (a assinatura da
marca) fica exclusiva do carrinho varejo, aparece nas abas Início/Produtos e
some nas abas Carrinho/Atacado (você já está olhando pro carrinho relevante,
não faz sentido um atalho pra si mesmo). O resumo do atacado é restilizado
com os mesmos tokens (Martian Mono nos números, chassi claro) mas continua
sendo um cartão fixo no rodapé da aba, não uma cápsula flutuante — são dois
fluxos de compra paralelos, não quero implicar que são a mesma coisa.

**Autocrítica:** eu produziria um segmented-control-de-categoria +
rail-de-marca pra qualquer catálogo com poucas categorias e muitas marcas?
Sim, a forma é genérica. O que não é genérico é *que cor nenhuma marca tem* —
o rail de marca é propositalmente monocromático (preto/branco/cinza) porque
a cor pertence ao sabor, nunca à marca. Isso é a tese, não um acidente de
implementação.

---

## Wireframes ASCII (390×844)

### Header + navegação (persistente em todas as abas)

```
┌──────────────────────────────────────┐
│ VIPpods                               │ ← 56px, --branco, hairline --aluminio
├──────────────────────────────────────┤
│                                        │
│           (conteúdo da aba)           │
│                                        │
├──────────────────────────────────────┤
│  🏠      🛍️      📦      🛒(3)        │ ← bottom-nav, 64px + safe-area
│ Início Produtos Atacado Carrinho      │
└──────────────────────────────────────┘
```

### Aba Início (Espectro como vitrine, não banner)

```
┌──────────────────────────────────────┐
│ VIPpods                               │
├──────────────────────────────────────┤
│ Filtrar por sabor                     │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐  │
│ │🟦││🟥││🟧││🟩││🟪││🩷││🟠││🟫││⚪│··│ ← Espectro, scroll-snap
│ └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘  │   (aria-pressed no ativo)
│  ice verm trop citr uva doce ener tab │
│                                        │
│ Em destaque                           │
│ ┌───────────┐  ┌───────────┐          │
│ │ [img 1:1] │  │ [img 1:1] │          │ ← 2 cards normais,
│ │ ▍categoria│  │ ▍categoria│          │   não slide full-bleed
│ │ Nome      │  │ Nome      │          │
│ │ PUFFS·mg  │  │ PUFFS·mg  │          │
│ │ R$ 00,00  │  │ R$ 00,00  │          │
│ │      ⊕   │  │      ⊕   │          │
│ └───────────┘  └───────────┘          │
│                                        │
│       [ Ver catálogo completo ]       │
├──────────────────────────────────────┤
│         (bottom nav)                  │
└──────────────────────────────────────┘
        ┌──────────────────────┐
        │● 3 itens · R$269,70 →│ ← Barra LED, flutuante
        └──────────────────────┘
```

### Aba Produtos (o filtro é a hierarquia)

```
┌──────────────────────────────────────┐
│ VIPpods                               │
├──────────────────────────────────────┤
│ [Descartável][Recarreg.][Refil][Acess]│ ← segmented, 4 pílulas
│                                        │
│ Filtrar por sabor                     │
│ 🟦 🟥 🟧 🟩 🟪 🩷 🟠 🟫 ⚪ ··          │ ← Espectro (mesmo state global)
│                                        │
│ ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪  │ ← rail de marca, mono, scroll-x
│ Oxbar Ignite ElfBar LostMary Vozol ·· │
│                                        │
│ [🔍 Buscar por nome...]  [Ordenar ▾]  │
│ 214 produtos encontrados               │
│                                        │
│ ┌───────────┐ ┌───────────┐           │
│ │           │ │           │           │ ← grid 2 col, 24 renderizados,
│ │  card 1   │ │  card 2   │           │   IntersectionObserver carrega
│ │           │ │           │           │   +24 a 600px do fim
│ └───────────┘ └───────────┘           │
│ ┌───────────┐ ┌───────────┐           │
│ │  card 3   │ │  card 4   │           │
│ └───────────┘ └───────────┘           │
│              ⋮                        │
├──────────────────────────────────────┤
│         (bottom nav)                  │
└──────────────────────────────────────┘
        ┌──────────────────────┐
        │● 3 itens · R$269,70 →│
        └──────────────────────┘
```

### Card de produto (detalhe)

```
┌───────────────┐
│▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬│ ← 3px sólido var(--sabor), único lugar com cor sólida
│  ┌─────────┐  │
│  │         │  │
│  │  1:1    │  │ ← object-fit:contain, 12px padding, CLS 0
│  │         │  │
│  └─────────┘  │
│ DESCARTÁVEL    │ ← caption, grafite-500
│ Nome do produto│ ← title, Public Sans 600
│ Marca · Sabor  │ ← body, grafite-500
│ [2000 PUFFS]   │ ← badge Martian Mono, fundo sabor 14%
│ R$ 41,46    ⊕  │ ← preço Martian Mono 600 · botão 32px pintado /
└───────────────┘    44px de área de toque real (::before inset:-6px)
```

### Bottom sheet de produto (92vh, drag-to-dismiss)

```
┌──────────────────────────────────────┐
│              ▬▬▬▬                    │ ← grabber 36×4
│                                        │
│         ╭─────────────╮               │
│        ╱ (glow sabor)  ╲              │
│       │    [img 1:1]    │             │
│        ╲               ╱              │
│         ╰─────────────╯               │
│                                        │
│ DESCARTÁVEL                           │
│ Oxbar Menta 2000 Puffs                │ ← display-2, Archivo Expanded
│ Oxbar · Menta                         │
│                                        │
│ PUFFS 2.000 · NIC 50MG · ML 12        │ ← Martian Mono, tracking .06em
│                                        │
│ Oxbar Menta 2000 Puffs — produto de   │
│ exemplo (placeholder)...              │ ← description real do JSON
│                                        │
├──────────────────────────────────────┤
│  [−]  1  [+]      [ Adicionar ]       │ ← sticky no rodapé do sheet
└──────────────────────────────────────┘
   backdrop 48%, inert no fundo, focus trap, Esc fecha
```

### Barra LED (estado parado vs. pulso)

```
parado:              acabou de adicionar (pulso 600ms, 2×):
┌──────────────────┐  ┌──────────────────┐
│●  3 itens         │  │◉  4 itens         │  ← LED escala 1→1.7→1,
│   R$ 269,70    →  │  │   R$ 301,60    →  │    box-shadow no tom
└──────────────────┘  └──────────────────┘     do último sabor
grafite-900, --e-led, --r-pill, 56px altura, 16px das bordas + safe-area
```

### Atacado (resumo próprio, sem Barra LED)

```
┌──────────────────────────────────────┐
│ Atacado / Revendedor                  │
│ Pedido mínimo de 50 unidades          │
│ [Descartável][Recarreg.][Refil][Acess]│
│ [🔍 Buscar...]                        │
│ ┌───────────┐ ┌───────────┐           │
│ │ card + qty│ │ card + qty│           │ ← mesmo card, stepper
│ │ [-] 0 [+] │ │ [-] 0 [+] │           │   embutido, sem ⊕ solto
│ └───────────┘ └───────────┘           │
├──────────────────────────────────────┤
│ Total de unidades         42          │ ← cartão fixo, Martian Mono
│ Total do pedido      R$ 967,00        │
│ Faltam 8 unidades pro mínimo          │
│ [ Finalizar pedido no WhatsApp ]      │ ← disabled até bater mínimo
├──────────────────────────────────────┤
│         (bottom nav)                  │
└──────────────────────────────────────┘
```

### Portão 18+ (bloqueante, antes de tudo)

```
┌──────────────────────────────────────┐
│                                        │
│              VIPpods                  │
│                                        │
│   Este site vende produtos pra        │
│   maiores de 18 anos.                 │
│                                        │
│   Você é maior de 18 anos?            │
│                                        │
│   [ Sim, sou maior de 18 ]            │
│   [ Não sou maior de 18 ]             │
│                                        │
└──────────────────────────────────────┘
  <dialog> sem botão de fechar, sem clique-fora, grava em localStorage
```

---

## Resumo de risco (uma frase cada)

- **Matar o accent global:** assumo focus/link sem cor de marca própria
  porque é o que torna a cor do sabor a única saturada da tela.
- **3 fontes custom:** aceito o custo de rede porque é o gesto tipográfico da
  marca; mitigo com subset + swap + só os pesos usados.
- **Trocar 2 `<select>` nativos por controles próprios:** perco semântica
  nativa de formulário pra ganhar hierarquia visual e consistência com o
  Espectro — reimplemento acessibilidade na mão (mesma exigência que o
  briefing já fazia pro Espectro).
- **Início vira vitrine do Espectro, não mantém o carrossel-banner:** o
  conteúdo antigo era o componente explicitamente vetado; prefiro reaproveitar
  o Espectro (mesmo estado, mesma cor) a inventar um herói novo não pedido.
- **Barra LED só no varejo:** dois carrinhos com regras diferentes (sem
  mínimo vs. com mínimo) não deveriam parecer o mesmo objeto — a assinatura
  da marca fica reservada pro fluxo principal.
- **Melancia com Gelo / Morango com Gelo mudam de família em relação à fruta
  base** (documentado em `SABORES.md`): a sensação de "gelado" pesa mais que
  a fruta na decisão de compra do cliente.

---

Aguardando sua confirmação pra seguir pra Fase 2 (tokens + reset + Espectro +
rail de marcas em código). As três decisões de estrutura acima (segmented de
categoria, Início sem carrossel, LED só no varejo) são as que eu mais quero
que você confirme ou corrija antes de eu codar em cima delas.
