# Especificación de Promociones Mensuales — Chic&Love Ecuador

> Documento normativo y guía técnica para incorporar, configurar y verificar campañas de promociones mensuales en el repositorio de Chic&Love Ecuador (<https://chiclove-ec.com>).
> **Regla de oro:** No modificar la estética ni la estructura HTML/CSS de las páginas. Las promociones se gestionan exclusivamente a través de los datos del catálogo en `js/products.js`, sus generadores y los scripts de verificación existentes.

---

## 1. Resumen y Principios de Diseño

Chic&Love opera con promociones temporales que se anuncian de forma elegante y consistente en todo el sitio:
1. **Panel destacado (Banda de Promoción)** en la página de inicio (`index.html`) y en la tienda (`tienda.html`), con estética compacta, kicker temporal, badge de descuento, precio tachado, CTA y fotografía editorial de producto.
2. **Etiquetas y estados en tarjetas de producto** (`.pcard` en inicio, tienda y secciones de productos relacionados): borde acentuado (`.is-promo`), etiqueta superior de porcentaje (`.pcard-promo-tag`), precio actual, precio anterior tachado, desglose mensual y píldora de ahorro.
3. **Ficha de producto adaptativa** (`<slug>.html` / `producto.html`): aviso de vigencia (`#pd-promo`), opción individual con badge de ahorro, desactivación automática de packs si frascos sueltos resultan más económicos (`singleOnly: true`), y ajuste del titular a «Tu presentación».
4. **Franja superior unificada** (`.topbar-offer`): anuncio de la campaña activa en todas las páginas.
5. **Capa semántica y agentes**: sincronización automática de Schema.org (`Product`/`Offer`), `catalog.json`, gemelos markdown (`.md`), `llms.txt` y respuestas para IA.
6. **Entrada y salida desatendidas**: el navegador conmuta a las 00:00 hora de Ecuador (UTC-5) y GitHub Actions (`refresh-catalog.yml`) actualiza lo generado a las 00:07.

---

## 2. Fuente Única de Verdad: `js/products.js`

Toda la configuración comercial de una promoción mensual vive en `js/products.js`. Jamás se introducen precios o textos promocionales directamente en los archivos HTML.

### 2.1. Definición del Periodo Mensual (`CL_PROMO_<MES>`)

Se define un objeto inmutable con los metadatos de la campaña del mes:

```javascript
const CL_PROMO_NOVIEMBRE = Object.freeze({
  monthLabel: "noviembre",                    // Nombre del mes en minúsculas (para textos tipo "Solo en noviembre")
  endsLabel: "30 de noviembre",               // Fecha visible de cierre (para deadline "Hasta el 30 de noviembre")
  singleOnly: true,                           // true si los frascos sueltos rebajados hacen que los packs no ahorren
  start: Date.parse("2026-11-01T00:00:00-05:00"),  // 00:00 del primer día en hora Ecuador (UTC-5)
  end: Date.parse("2026-12-01T00:00:00-05:00"),    // 00:00 del primer día del mes siguiente (UTC-5, exclusivo)
  priceValidUntil: "2026-11-30"               // Último día calendario en formato ISO AAAA-MM-DD (para JSON-LD)
});
```

#### Regla de Validación de Fechas
- `start` y `end` deben ser números finitos (timestamps en milisegundos).
- La zona horaria debe ser obligatoriamente `-05:00` (Ecuador continental).
- `priceValidUntil` debe ser exactamente el día anterior a `end` a las 00:00 UTC-5.
- La suite de pruebas (`tests/promotions.test.mjs`) comprueba que `monthLabel`, `endsLabel` y `priceValidUntil` coincidan matemáticamente con la ventana temporal.

---

### 2.2. Asignación de Productos en `CL_PROMOS`

Cada producto participante se registra en `CL_PROMOS` usando su identificador (`id`):

```javascript
const CL_PROMOS = Object.freeze({
  "radiant-skin": Object.freeze({ ...CL_PROMO_NOVIEMBRE, price: 18.00 }),
  "hair-nails-forte": Object.freeze({ ...CL_PROMO_NOVIEMBRE, price: 22.49, group: "coleccion" }),
  "vinagre-de-manzana": Object.freeze({ ...CL_PROMO_NOVIEMBRE, price: 22.49, group: "coleccion" }),
  "sleep-vitamins": Object.freeze({ ...CL_PROMO_NOVIEMBRE, price: 22.49, group: "coleccion" }),
  "sexual-booster-women": Object.freeze({ ...CL_PROMO_NOVIEMBRE, price: 22.49, group: "coleccion" }),
  "sexual-booster-men": Object.freeze({ ...CL_PROMO_NOVIEMBRE, price: 22.49, group: "coleccion" }),
  "anti-stress": Object.freeze({ ...CL_PROMO_NOVIEMBRE, price: 22.49, group: "coleccion" })
});
```

#### Regla Estricta: `singleOnly`
- Si `2 * promo.price <= product.pricePack` (ej. $22.49 × 2 = $44.98 ≤ $49.99) ó `3 * promo.price <= product.pricePack3` (ej. $22.49 × 3 = $67.47 ≤ $74.99):
  - Es **obligatorio** fijar `singleOnly: true`.
  - Motivo: ofrecer packs en ese momento perjudicaría al cliente, cobrándole más que si comprase frascos sueltos.
  - La suite de pruebas (`tests/promotions.test.mjs`) falla si `singleOnly` no coincide exactamente con esta condición matemática.

---

### 2.3. Agrupación en Bandas: `CL_PROMO_GROUPS`

Cuando varias fórmulas comparten el mismo porcentaje de descuento y fechas, deben agruparse bajo un identificador común (`group`) para mostrarse en una única banda consolidada:

```javascript
const CL_PROMO_GROUPS = Object.freeze({
  coleccion: Object.freeze({
    title: "Toda la colección",
    label: "toda la colección",
    cta: "Ver la colección",
    image: "assets/img/promo-coleccion.webp",
    imageSmall: "assets/img/promo-coleccion-640.webp",
    imageNarrow: "assets/img/promo-coleccion-movil.webp",
    accent: "#8C6FC9",
    accentDark: "#6A4FA8"
  })
});
```

- **Fórmula individual sin grupo:** Si un producto no tiene `group` (por ejemplo, Radiant Skin al −40%), genera su propia banda individual usando su foto editorial de tienda (`storeSmall` y `store`), y el enlace lleva directamente a su ficha de producto (`/<slug>`).
- **Fórmulas agrupadas:** Generan una banda conjunta con las imágenes de `CL_PROMO_GROUPS`, y el enlace lleva a la tienda (`/tienda`), haciendo scroll hacia la rejilla de productos.
- **Requisitos de assets para grupos:**
  - `image`: composición horizontal a 900w WebP.
  - `imageSmall`: versión responsive a 640w WebP.
  - `imageNarrow`: versión vertical estrecha para móvil (`max-width: 520px`), evitando que los frascos laterales queden cortados.
  - Todos los archivos deben estar registrados en la lista blanca de `scripts/build.mjs`.

---

## 3. Especificación de Componentes Visuales

No se deben alterar las clases CSS ni la estructura semántica. El comportamiento y la estética están garantizados por las siguientes reglas:

### 3.1. Panel de Promoción en Inicio y Tienda (Banda de Promoción)

#### Contenedores en HTML
- **Inicio (`index.html`):**
  ```html
  <section class="promo-band-section" data-promo-band hidden>
    <div class="wrap"></div>
  </section>
  ```
  Ubicado inmediatamente antes de la sección `#productos` (Bestsellers). Cuando hay promociones activas, el atributo `hidden` se retira y se añade espaciado vertical armónico.
- **Tienda (`tienda.html`):**
  ```html
  <div class="promo-band-slot" data-promo-band hidden></div>
  ```
  Ubicado dentro del contenedor principal, sobre la barra de filtros por objetivo.

#### Estructura del DOM generado por `promoBand(band)`:
```html
<a class="promo-band [is-group]" href="..." style="--a: ...; --a-dark: ...;" aria-label="...">
  <div class="promo-band-copy">
    <div class="promo-band-head">
      <span class="promo-band-kicker">Solo en [mes]</span>
      <span class="promo-band-badge">−[XX]%</span>
    </div>
    <h2>[Título del grupo o Nombre corto del producto]</h2>
    <p class="promo-band-prices">
      <strong>$[precio-promo]</strong>
      <del>$[precio-lista]</del>
      <span class="promo-band-vat">IVA incluido</span>
    </p>
    <div class="promo-band-actions">
      <span class="promo-band-cta">[CTA]</span>
      <span class="promo-band-deadline">Hasta el [endsLabel]</span>
    </div>
  </div>
  <div class="promo-band-media">
    <!-- Para grupos con imagen narrow -->
    <picture>
      <source media="(max-width: 520px)" srcset="[imageNarrow]">
      <img src="[imageSmall]" srcset="[imageSmall] 640w, [image] 900w" sizes="(max-width: 720px) 38vw, 360px" width="900" height="988" alt="" loading="lazy" decoding="async">
    </picture>
  </div>
</a>
```

#### Comportamiento Dinámico:
1. **Orden de descuento:** Las bandas se ordenan siempre de mayor a menor porcentaje de descuento.
2. **Carga prioritaria (Eager):** La primera banda se carga con `loading="eager"` (o sin `lazy`) para optimizar el LCP sobre el pliegue; las subsiguientes llevan `loading="lazy"`.
3. **Filtros de tienda:** Al interactuar con los chips de objetivo en `tienda.html`, `promoBandFitsFilter` oculta automáticamente cualquier banda si ninguno de sus productos pertenece al filtro seleccionado.

---

### 3.2. Secciones Relacionadas y Tarjetas de Producto con Descuento

Aplica a todas las tarjetas `.pcard` en:
- Portada (`index.html` → `#productos .products-grid`)
- Tienda (`tienda.html` → `.page-store .products-grid`)
- Fichas de producto (`<slug>.html` / `producto.html` → `#related-grid .products-grid`)

#### Elementos requeridos en la tarjeta:
1. **Clase del artículo:** `<article class="pcard is-promo" data-product-id="...">`
   - `.is-promo`: aplica borde sutil teñido con el color de acento (`border-color: color-mix(in srgb, var(--a) 42%, #fff)`).
2. **Tag de descuento:** `<span class="pcard-promo-tag">−[XX]%</span>` colocado junto al tag de objetivo (`.pcard-tag`).
3. **Precios en el pie:**
   ```html
   <div class="pcard-price">
     <div class="pcard-price-head">
       <strong class="pcard-now-price">$[precio-promo]</strong>
       <del class="pcard-was-price">$29.99</del>
     </div>
     <small class="pcard-vat">IVA incluido</small>
     <div class="pcard-pack-prices">
       <small>−[XX]% en [mes]</small>
     </div>
     <span class="pcard-saving">Ahorras $[ahorro]</span>
   </div>
   ```
4. **Preservación de simetría:** La tarjeta en promoción reutiliza exactamente las mismas ranuras estructurales que la tarjeta estándar, garantizando que la rejilla se mantenga alineada sin saltos visuales.

---

### 3.3. Página de Detalle de Producto (`<slug>.html` / `producto.html`)

1. **Aviso superior de promoción:**
   `<div id="pd-promo" class="pd-promo">Promo hasta el [endsLabel]</div>`
   - Visible (`hidden = false`) únicamente mientras la promoción esté activa.
2. **Selector de variantes:**
   - La opción individual («1 frasco») añade la chapa `.save` con `−[XX]%` y el subtítulo `Antes $29.99, ahorras $[ahorro]`.
   - Si `singleOnly: true`, las variantes de Pack x2 y Pack x3 no se renderizan ni se ofrecen.
   - El titular `.pd-buy-label` conmuta automáticamente a **«Tu presentación»** (en vez de «Elige tu presentación»).
3. **Barra fija inferior móvil (`#pd-sticky-bar`):**
   - Actualiza el precio mostrado al precio promocional vigente.
4. **Productos relacionados (`#related-grid`):**
   - Excluye el producto actual y refleja el estado promocional de las demás fórmulas.

---

### 3.4. Franja Superior Global (`.topbar-offer`)

En todas las páginas del sitio:
```html
<span class="topbar-offer" data-catalog-offer>...</span>
```
- Texto compuesto automáticamente por `clCatalogOfferText()`:
  - Con promoción activa: `[Producto/Grupo 1] −[XX]% y [Producto/Grupo 2] −[YY]% en [mes]` (ej. «Radiant Skin −40% y toda la colección −25% en octubre»).
  - Sin promoción activa: `Packs x2 por $49.99 y x3 por $74.99.`
- Se genera en el HTML estático para lectores sin JavaScript y se refresca por `js/main.js` al hidratar.

---

## 4. Capa Semántica, Datos Estructurados y Agentes

Al activar una promoción, los artefactos derivados deben reflejar los precios con precisión:
1. **Schema.org JSON-LD (`Product`):**
   - `offers.price`: precio promocional vigente.
   - `offers.priceValidUntil`: fecha límite ISO (`YYYY-MM-DD`).
   - `additionalProperty`: describe la escalera de precios y aclara si los packs están temporalmente pausados.
2. **Artefactos para Agentes y LLMs:**
   - `catalog.json`: catálogo estructurado con `pricing.single`, `pricing.promotion` (`price`, `endsOn`, `percentOff`).
   - `agents.md`, `llms.txt`, `llms-full.txt`: resúmenes de la oferta del mes y fechas autoritativas.
   - `respuestas.md`: respuestas precalculadas para asistentes con el precio promocional y fecha de cierre.
   - `guia-de-eleccion.md` y `en.md`: tablas comparativas y resumen en inglés.

---

## 5. Automatización y Ciclo de Vida

El ciclo de promociones está 100% automatizado mediante GitHub Actions:

### 5.1. Workflow `.github/workflows/refresh-catalog.yml`
- Se ejecuta automáticamente a las **00:07 hora de Ecuador (05:07 UTC)** cada día, con reintentos a las 02:37 y 08:07.
- Ejecuta `npm run refresh`:
  1. Evalúa el estado del catálogo en la fecha actual.
  2. Si una promoción acaba de iniciar o finalizar, regenera los HTML, JSON-LD, Markdown y `catalog.json`.
  3. Si hubo cambios, actualiza `contentModified` en `site.config.json` para alertar a los buscadores a través de `sitemap.xml`.
  4. Crea una rama `auto/catalogo-<fecha>`, abre un Pull Request, ejecuta la suite de validación CI, espera la aprobación de checks y lo fusiona automáticamente a `main`.

### 5.2. Simulación de Fechas Futuras
Para verificar cómo se verá el sitio al expirar la promoción o en una fecha específica:
```bash
npm run refresh -- --now=2026-11-01T00:00:00-05:00
```
Permite comprobar localmente que al llegar las 00:00 del día posterior al cierre, todo el sitio retorna de forma limpia a los precios estándar de lista ($29.99, packs a $49.99 y $74.99) sin dejar residuos visuales.

---

## 6. Procedimiento Operativo: Cómo Añadir una Promoción Mensual (Paso a Paso)

Sigue esta lista de verificación cada mes para desplegar una nueva campaña:

### Paso 1: Configurar la campaña en `js/products.js`
1. Crea la constante del mes (ej. `CL_PROMO_NOVIEMBRE`) con `monthLabel`, `endsLabel`, `start`, `end`, `priceValidUntil` y `singleOnly`.
2. Asigna las promociones en `CL_PROMOS` para cada producto que participe.
3. Si utilizas un grupo nuevo, defínelo en `CL_PROMO_GROUPS` y añade las imágenes correspondientes a `assets/img/` (y a la lista blanca de `scripts/build.mjs`).

### Paso 2: Regenerar artefactos derivados
Ejecuta:
```bash
npm run gen
```
Esto actualiza las páginas de producto `<slug>.html`, sus gemelos `.md`, los datos estructurados, `index.md`, `tienda.md`, `agents.md`, `catalog.json` y `llms-full.txt`.

### Paso 3: Ejecutar pruebas y verificación
Ejecuta la suite completa de pruebas:
```bash
npm run check
```
Debe pasar el 100% de los tests (195/195 o superior), incluyendo:
- Ventana temporal coherente y etiquetas correctas.
- Retirada obligatoria de packs si los frascos sueltos son más económicos (`singleOnly`).
- Imágenes de grupo existentes y en la lista blanca del build.
- Coherencia de precios en JSON-LD, markdown y texto visible.

### Paso 4: Validar el cierre de la promoción
Comprueba que al expirar la promoción el catálogo vuelve limpiamente al estado base:
```bash
npm run refresh -- --now=<fecha-fin-iso>
```
Revierte cualquier cambio generado por la simulación antes de hacer commit.

### Paso 5: Commit y Push a `main`
Realiza el commit con un mensaje descriptivo y súbelo a GitHub:
```bash
git add js/products.js [archivos regenerados]
git commit -m "Promociones de [mes]: [resumen de ofertas]"
git push origin main
```
CI validará la suite y GitHub Pages desplegará automáticamente la nueva campaña.
