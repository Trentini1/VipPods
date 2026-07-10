# Sabores → famílias de cor

Mapeamento feito em cima do campo **estruturado** `flavor` (mais confiável que
regex em `name`), com o nome como reforço só quando `flavor` vem vazio. Rodado
contra os 555 produtos reais de `data/products.json`.

## Dicionário de palavras-chave (normalizado: sem acento, minúsculo)

```
gelo | gelada | gelado          → ice        (regra tem prioridade sobre a fruta base)
menta                           → ice
melancia | morango | cereja |
framboesa | frutas vermelhas    → vermelha
abacaxi | banana | manga |
maracuja | coco | pessego |
tropical                        → tropical
limao | maca verde | kiwi       → citrico
uva | amora | blue razz |
groselha                        → uva
baunilha | chiclete | lichia    → doce
energetico                      → energetico
tabaco                          → tabaco
(sem match / flavor vazio)      → neutro
```

## Sabor real (campo `flavor`) → família

| `flavor` (dado real) | família | cor |
|---|---|---|
| Abacaxi | tropical | `#FFA318` |
| Amora | uva | `#9B6BFF` |
| Banana | tropical | `#FFA318` |
| Baunilha | doce | `#EF8FBE` |
| Blue Razz | uva | `#9B6BFF` |
| Café Gelado | ice | `#4FD1D9` |
| Cereja | vermelha | `#F04060` |
| Chiclete | doce | `#EF8FBE` |
| Coco | tropical | `#FFA318` |
| Cola Gelada | ice | `#4FD1D9` |
| Energético | energetico | `#FF5C2B` |
| Framboesa | vermelha | `#F04060` |
| Frutas Vermelhas | vermelha | `#F04060` |
| Groselha Preta | uva | `#9B6BFF` |
| Kiwi | citrico | `#C6D93A` |
| Lichia | doce | `#EF8FBE` |
| Limão | citrico | `#C6D93A` |
| Manga | tropical | `#FFA318` |
| Maracujá | tropical | `#FFA318` |
| Maçã Verde | citrico | `#C6D93A` |
| Melancia | vermelha | `#F04060` |
| Melancia com Gelo | **ice** | `#4FD1D9` |
| Menta | ice | `#4FD1D9` |
| Menta Gelada | ice | `#4FD1D9` |
| Morango | vermelha | `#F04060` |
| Morango com Gelo | **ice** | `#4FD1D9` |
| Pêssego | tropical | `#FFA318` |
| Tabaco Clássico | tabaco | `#B5824A` |
| Tropical Mix | tropical | `#FFA318` |
| Uva | uva | `#9B6BFF` |
| *(vazio)* | neutro | `#8A929B` |

**Chamadas de julgamento que fiz** (não são regra óbvia, decidi e assumo):

- `Melancia` sozinho → **vermelha** (é like berry-red na percepção do consumidor
  de pod), mas `Melancia com Gelo` e `Morango com Gelo` viram **ice** — o
  "com gelo" é a nota sensorial dominante, então a variante gelada muda de
  família mesmo sendo a mesma fruta base. Isso significa que a mesma fruta
  pode aparecer em duas cores diferentes no Espectro (Morango normal =
  vermelho, Morango com Gelo = ciano). Acho isso correto (é literalmente um
  produto diferente pro cliente), mas é uma decisão, não um fato.
- `Menta` (sem "gelada") já entra em **ice** direto — mentol é lido como frio
  independente da palavra "gelo" aparecer.
- `Amora`, `Blue Razz`, `Groselha Preta` → **uva**, não **vermelha** — são
  frutas escuras/púrpuras, não vermelhas; agrupei pela cor real da fruta, não
  pela família "berry" genérica.
- `Lichia` → **doce**, não **tropical** — na percepção de sabor de pod, lichia
  é vendida como nota floral/doce, não como fruta tropical ácida.
- `Banana` e `Coco` → **tropical**, mesma família de manga/abacaxi/maracujá.

## Distribuição final (555 produtos)

```
tropical:    123
ice:         104
vermelha:    102
doce:         64
uva:          62
citrico:      54
energetico:   18
tabaco:       16
neutro:       12
```

## Todo produto que caiu em `neutro` — revisão manual

Todos os 12 são **carregadores USB-C** (categoria `Acessório`, sem sabor
aplicável — correto ficarem em neutro). Nenhum descartável/pod/refil caiu
aqui; o dicionário cobriu 100% dos sabores reais que existem no catálogo.

| id | produto |
|---|---|
| 12 | Nasty Bar - Carregador USB-C |
| 70 | Tugboat - Carregador USB-C |
| 107 | Oxbar - Carregador USB-C |
| 128 | Fume - Carregador USB-C |
| 194 | Aroma King - Carregador USB-C |
| 283 | Randm - Carregador USB-C |
| 296 | Uwell Caliburn - Carregador USB-C |
| 320 | Waka - Carregador USB-C |
| 431 | Hyppe - Carregador USB-C |
| 435 | Ignite - Carregador USB-C |
| 438 | Lost Mary - Carregador USB-C |
| 441 | Geek Bar - Carregador USB-C |

Se depois vocês adicionarem acessórios com outro nome (ex: "Pod de reposição",
"Case protetor"), eles também cairão em `neutro` automaticamente — é o
comportamento certo, não precisa de regra nova.
