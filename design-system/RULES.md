# TEAM23 HUB — Reglas de interacción

Reglas de craft para el hub. **No son un rediseño**: el sistema visual (trazos
gruesos, sombras planas, neones, Helvetica + Averia) no se toca. Lo que está acá
es cómo se tiene que *sentir* lo que ya existe.

Vienen de la skill [`apple-design`](https://github.com/emilkowalski/skills) —
destilada de las charlas de diseño de Apple (*Designing Fluid Interfaces*,
WWDC 2018; *The Details of UI Typography*, 2020; *Principles of Great Design*).
Los `§` remiten a esas secciones.

Se implementan en:

| archivo | qué es |
| --- | --- |
| `tokens/motion.css` | escala de duración y curvas. Se importa desde `styles.css`. |
| `interaction.css` | la capa additive. Se linkea **después** del `<style>` de cada página. |

## Por qué el `<link>` va al final del `<head>`

Las páginas tienen todo su CSS en un `<style>` inline. Las reglas de
`interaction.css` apuntan a los mismos selectores con la misma especificidad, así
que **gana la última en cargar**. Si el `<link>` se mueve arriba del `<style>`,
la mitad de la capa deja de aplicar en silencio.

Por la misma razón la capa **no** usa `@layer`: una regla dentro de un layer
siempre pierde contra una regla sin layer, sin importar el orden.

Para desactivar todo: se borran los 5 `<link>`. No hay dependencias en la otra
dirección.

---

## 1 · Respuesta — el feedback va en el pointer-down (§1)

> En el momento en que aparece lag, la sensación de manipulación directa "se cae
> por un precipicio".

- **Todo lo clickeable tiene `:active`.** En CSS `:active` dispara en el
  pointer-down, así que es feedback instantáneo por definición. El `:hover` no
  sustituye: en touch no existe, y el `click` llega en el release, tarde.
- El press entra en `--dur-instant` (80ms). Se tiene que leer como inmediato, no
  como una animación.
- **Nada de latencia artificial en el camino del input.** Hay cuatro
  `setTimeout` de 800–1500ms en `index.html` que simulan trabajo
  (`:2343`, `:4919`, `:4928`, `:5087`). Si el dato ya está, no se espera.
- El lenguaje del press es uno solo para todo el hub:
  - lo que se levanta en hover, en press vuelve a bajar y encoge un pelo
  - lo plano encoge (`scale(.97)`)
  - las celdas de tabla se oscurecen (`transform` en `<td>` es frágil)

## 2 · Un solo anillo de foco, y que se vea (§16)

- Anillo único: `3px solid var(--red)`, `outline-offset: 2px`, en **todo** lo
  enfocable. Sobre relleno rojo pasa a `var(--ink)`, porque rojo sobre rojo no
  se ve.
- Un indicador de foco necesita **3:1** contra lo que tenga al lado
  (WCAG 2.2 SC 1.4.11). Un anillo translúcido casi nunca llega: el que había en
  los inputs, `rgba(255,0,0,.35)`, componía a ~1.4:1.
- **`outline` es del foco.** Si se usa para marcar selección, los dos estados se
  vuelven indistinguibles — le pasaba a `.cp-sw.on`. La selección va por
  `box-shadow`.
- **Nunca `outline:none` sin reemplazo en la línea siguiente.**

## 3 · Área de click ≥ 24px (§10)

Mínimo 24×24 (WCAG 2.2 SC 2.5.8). Cuando el control tiene que verse chico, se
agranda el área con un `::after` transparente en `inset: -5px` — el layout no se
mueve.

Todavía por debajo del mínimo y sin arreglar (piden tocar HTML): `.trk-toggle`
en mobile llega a 26px de alto pero se queda corto de ancho.

## 4 · Movimiento

### La escala

| token | valor | para qué |
| --- | --- | --- |
| `--dur-instant` | 80ms | press |
| `--dur-fast` | 120ms | hover, foco, swaps de color de estado |
| `--dur-base` | 180ms | mover un elemento (cards, carets) |
| `--dur-slow` | 260ms | entrada/salida de superficies (toast, sheets) |

| token | valor | para qué |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(.2,0,.2,1)` | entra / se asienta |
| `--ease-in` | `cubic-bezier(.8,0,.8,1)` | sale — **espejo exacto** de `--ease-out` |
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | neutro |
| `--ease-overshoot` | `cubic-bezier(.34,1.26,.64,1)` | rebote |

Nada de duraciones sueltas. Antes había seis (`.12 / .15 / .18 / .2 / .25 / .3s`)
y una sola curva, la default.

### Reglas

- **Curvas espejadas en lo reversible (§7).** Lo que entra con `--ease-out` sale
  con `--ease-in`. Los puntos de control de uno son la inversión de los del otro.
- **Rebote sólo después de inercia (§4).** `--ease-overshoot` se usa cuando el
  gesto que lo disparó traía velocidad — un flick, un drag que se suelta. En un
  menú que sólo apareció, el overshoot se siente mal. Default de la casa:
  sin rebote (damping 1.0).
- **Nunca `transition: all`.** Transiciona lo que no querías y lo que se agregue
  mañana. Le pasaba a `.task-pill` y a `#toast` (un toast de error crossfadeaba
  de tinta a rojo mientras entraba).
- **Sólo `transform` y `opacity` (§11).** Son las dos que el compositor puede
  animar sin recalcular layout. `t23sweep` animaba `left` en un
  `infinite alternate` — layout en cada frame mientras el loader estuviera
  montado.
- **Lo que entra por un lado, sale por el mismo lado (§7).** Y ancla el origen:
  un popover escala desde el elemento que lo abrió, no desde su propio centro.
- **Si el nodo se re-renderiza, la transición no corre.** `toggleTareasOpen()`
  llama a `renderDetail()`, que reemplaza el markup entero: el caret nuevo nace
  ya rotado y el `transition` de 150ms nunca se ejecuta. `sxToggle()` hace lo
  contrario a propósito — muta la clase en su lugar — y por eso sí anima. Para
  animar un estado, tocá la clase, no reconstruyas el DOM.
- El `transition` de `details.year summary::before` es **código muerto**: lo
  único que cambia `[open]` es `content`, que no es animable. Está sin arreglar
  porque el fix (rotar un glifo único en vez de intercambiar `+`/`–`) cambia el
  markup.

### Lo que CSS no puede hacer

Una `transition` de CSS no tiene velocidad, no hereda la del dedo y no se puede
agarrar a mitad de camino. Sirve para hover, press, foco y cambios de estado —
nada de eso se arrastra.

**Cualquier cosa que se arrastre necesita un spring en JS** (§3, §5, §6):
animar desde el valor *presentado* (el que está en pantalla ahora, no el
target), heredar la velocidad del release, proyectar el punto de llegada con
`(v/1000)·d/(1−d)` con `d ≈ 0.998`, y resistir de a poco en los bordes en vez de
frenar en seco. Hoy el hub no tiene ningún gesto: cero listeners de
`pointer*`/`touch*`/`drag`. Si se agrega uno, se agrega con spring, no con
`transition`.

## 5 · Superficies y profundidad (§12)

- **El feedback tiene que llegar.** `#toast` estaba en `z-index: 200`, debajo de
  los overlays (80/1100/1200), de `.t23-ov` (9000) y de los popovers (9999) — y
  se dispara desde los handlers de guardado *adentro* de los modales. El único
  canal de feedback de la app se renderizaba detrás de lo que lo emitía. Ahora
  está en 12000.
- **La escala de sombras y la de z-index tienen que coincidir.** Hoy no:
  `#acPanel` y `#dirChipPanel` están en `z-index: 9999` con las sombras más
  chicas (4–6px), y `.modal` está en 80–1200 con la más grande (10px). Cuando
  toques una, alineá la otra.
- No hay `backdrop-filter` en el proyecto y **está bien así**: el lenguaje es
  trazo grueso opaco, no vidrio. `--blur-surface` está declarado y sin usar.
- Dos scrims independientes (`.overlay` y `.t23-ov`) con el mismo
  `rgba(10,10,10,.45)`: apilados dan 70% y no diferencian profundidad. Si se
  apilan a propósito, el de abajo tiene que oscurecerse más.

## 6 · Tipografía (§15)

- **El tracking es específico del tamaño. Un solo valor está mal en algún lado.**
  Lo grande quiere tracking negativo; lo chico, cerca de 0 o positivo.
- Hoy `body` está en `-0.04em` y lo hereda todo, incluido el texto de 9–13px de
  las tablas. `interaction.css` afloja ese extremo a `-0.005em`.
  **El extremo grande quedó sin tocar a propósito** (`-0.04em` en un título de
  48px ya es el look de la marca). Si se quiere afinar: el hero pide ~`-0.05em` y
  `--tracking-display` (`-0.02em`, declarado en `typography.css` y nunca usado)
  es el token que estaba pensado para eso.
- **El line-height va al revés del tamaño.** Acá está bien encaminado (0.92 en
  el hero, 1.0–1.05 en títulos, 1.45–1.6 en prosa) con dos excepciones:
  `line-height: 1` cae sobre texto de 11px y de 15px.
- Los 12 tokens `--text-*-lh` de `typography.css` **no los usa nadie** — todos
  los `line-height` están escritos a mano. Al tocar tipografía, usalos.
- **`rem`, no `px`.** No hay un solo `rem` en el proyecto: subir el tamaño de
  fuente del navegador no cambia nada, la preferencia del usuario es inerte.
  Es el cambio más grande que queda pendiente y no entra en una capa additive —
  hay cajas de px calzadas a texto de px (`.chk-box` 30×30 para 19.6px,
  `table.trk td.trk-date{left:54px}` calzado al ancho de columna de 52px).
  Al escribir CSS nuevo: `rem`.

## 7 · Color y contraste

- **4.5:1** para texto normal, **3:1** para texto grande (≥18.66px bold /
  ≥24px regular), bordes de controles e indicadores de foco.
- **`#FF0000` da 3.99:1** contra blanco *y* como fondo con texto blanco. No
  llega. Se parte en dos usos en vez de reemplazarlo:

  | token | valor | dónde |
  | --- | --- | --- |
  | `--red` | `#FF0000` | bordes, anillos, puntos, barras, gráficos. Sobre negro da 5.25:1. |
  | `--red-strong` | `#D40000` | texto rojo chico y rellenos con texto blanco. 5.53:1 en los dos sentidos. |
  | `--red-deep` | `#B00000` | el hover de lo que arranca en `--red-strong`. |

  `#D40000` no es nuevo: es el que el proyecto ya usaba en `.btn.danger:hover`.
- **Las rayas también tienen mínimo.** `--hair` (`#CAC9CF`) da 1.64:1 y
  desaparece en pantallas con poco brillo. Se parte según lo que hace la raya:

  | token | valor | dónde |
  | --- | --- | --- |
  | `--rule-decorative` | `#B9B8BF` | interior de grillas densas (calendario, tracker) |
  | `--rule-functional` | `#8C8B93` | 3.37:1 — bordes de controles y separadores de lista, donde la raya *es* la interfaz |

  Los `#eee` (1.16:1) y `#ddd` (1.36:1) hardcodeados no se usan más: `#eee` era
  el único separador entre sugerencias del autocomplete.
- **Deshabilitado con color sólido, no con `opacity`.** La opacidad multiplica un
  ratio que ya venía justo: `opacity:.5` sobre `.btn.danger` dejaba el texto en
  ~2.2:1. Un estado deshabilitado tiene que leerse como deshabilitado *y* leerse.
- **El color no puede ser el único portador de significado.** Sin arreglar:
  `.section-head .dot` codifica pendiente/activo/completado sólo en el hue; en
  ≤640px `.chip` pasa a `font-size: 0` y queda un punto rojo de 10px sin
  etiqueta; `.fase-sw` es un botón de 16px cuyo único significado es su fondo.
  Todos necesitan texto, forma o `aria-label`.

## 8 · Preferencias del usuario (§14)

Reduced motion **no es "sin feedback"**: es feedback no vestibular. Se responde a
tres señales, y las tres están en `interaction.css`:

- **`prefers-reduced-motion`** — Un `*{transition:none}` a secas no alcanza:
  - no toca `scroll-behavior: smooth`, que sigue animando el scroll
  - no llega a lo que se anima desde JS (los ojitos que siguen el cursor escriben
    `style.transform` en cada `mousemove`; se anulan con un `!important`)
  - matar el `transition` de un hover que *mueve* el elemento no saca el
    movimiento: lo convierte en un salto. Hay que sacar el movimiento.
  - los indicadores de progreso pasan de girar/barrer a **pulsar la opacidad** —
    un crossfade no es vestibular, y sin nada el usuario pierde el indicador.
  - ojo con los `setTimeout` calibrados contra una transición que la query
    borra: el crossfade de la frase del loader se apagaba 250ms y volvía de
    golpe. Ese `transition: opacity` se mantiene a propósito.
- **`prefers-reduced-transparency`** — los scrims se vuelven más opacos, se van
  las opacidades decorativas.
- **`prefers-contrast: more`** — sube el piso re-declarando los tokens de
  contraste y engrosa el anillo de foco a 4px.
- **`forced-colors: active`** — casi todos los estados "encendido" del hub son un
  cambio de `background`, y el background es lo primero que ese modo reemplaza.
  Los estados `.on` / `.done` llevan un `outline: CanvasText` como pista que no
  depende del color.

---

## Pendiente — no entra en una capa de CSS

Ordenado por impacto. Todo esto necesita tocar HTML/JS.

1. **Los controles centrales son sólo-mouse.** 19 de 21 elementos clickeables no
   son `<button>`: son `div`/`span`/`td` con `onclick`, sin `tabindex`, sin
   `role` y sin handler de teclado. Incluye las cards de proyecto (la navegación
   principal de la app), los toggles día-por-persona del tracker, los chips del
   directorio y el orden de columnas. Los colapsables ▾ están peor: el `<button>`
   real lleva `tabindex="-1"` y el handler vive en el `div` padre, que no es
   enfocable — *Tareas TEAM 23* y *Calendario* no se pueden abrir con teclado.
   → `<button>` de verdad, o `role="button"` + `tabindex="0"` + Enter **y Space**.
2. **Los modales declaran `aria-modal="true"` y no lo cumplen.** 17 diálogos, sin
   mover el foco al abrir, sin trap, sin devolverlo al cerrar, y con todo el
   fondo todavía en el tab order. El atributo le dice al lector de pantalla que
   el resto de la página no está disponible, y es falso.
   → `<dialog>` + `showModal()`, o `inert` en el fondo + foco al abrir/cerrar.
   El manejo de Escape ya está bien hecho (cierra sólo el de arriba, resolviendo
   el orden por `z-index` en runtime), pero no alcanza a `.t23-ov`, que no es
   `.overlay`.
3. **`aria` faltante**: `aria-current` en las tabs (el estado activo es sólo una
   clase), `aria-sort` en las cabeceras ordenables, `aria-expanded` en todo lo
   que colapsa menos `.sx-head`, y nombre accesible en los botones de ícono que
   hoy se anuncian como "✕" o "▾" (o vacíos, en `.fase-sw` y `.cp-sw`). El
   autocomplete no tiene ARIA de combobox, así que el highlight con flechas es
   puramente visual. Ningún skip link en ninguna página.
4. **Sin debounce en el autocomplete**: cada tecla dispara un scan completo de
   `dirData.rows` + `getBoundingClientRect` + rebuild de `innerHTML`. El
   `mousemove` de los ojitos hace un `getBoundingClientRect` (layout forzado) por
   ojo por evento, sin `requestAnimationFrame` — que no aparece en el proyecto.
5. **`px` → `rem`** en tipografía y espaciado (ver §6).
6. **Dark mode**: definido completo en los tokens (`[data-theme="dark"]`) y
   conectado en ningún lado. Tres bloqueos independientes: ninguna página setea
   el atributo, las páginas aliasean sobre primitivos que no swapean
   (`--ink: var(--n-600)` en vez de `var(--tx-primary)`), y hay ~120 hexes
   hardcodeados. Los 5 alias theme-aware de `colors.css:26-30` son código muerto.
7. **Fuentes**: el webfont se descubre a través de un `@import` anidado tres
   niveles (`<link>` → `styles.css` → `typography.css` → Google Fonts) — cinco
   round trips en serie y el preload scanner no lo ve. El `preconnect` apunta a
   `fonts.googleapis.com` pero no a `fonts.gstatic.com`, que es de donde salen
   los `.woff2`, y va sin `crossorigin`. Falta en 3 de las 5 páginas. El fallback
   de Averia es `cursive` (una tipografía de guionada) y Averia está en `.btn`,
   así que el swap re-envuelve filas enteras de botones. La primaria (Nimbus
   Sans) no existe como archivo: todo renderiza en Helvetica/Arial.
8. **Bugs de CSS encontrados de paso, sin tocar**:
   - `.tbl-scroll table.cal{min-width:...}` está declarado dos veces en el mismo
     media query (700px y 540px): gana el 540px, que contradice el comentario que
     explica por qué hacían falta 700.
   - `zoom` en `#detailBody`, `#ovChooser .modal` y `#ovNew .modal` crea bloques
     contenedores: los popovers `position:fixed` posicionados con
     `getBoundingClientRect()` no compensan el factor de escala.
   - `#colorPanel` (`z-index: 1300`) queda por encima de `ovConfirm` (1200).
   - Zona muerta de 40px entre 721 y 759px: `.stat-grid` ya colapsó a 2 columnas
     y `.link-split` todavía no se expandió.
   - `proveedores.html` tiene el bloque de reduced-motion sin `animation: none`,
     así que su spinner sigue girando.
