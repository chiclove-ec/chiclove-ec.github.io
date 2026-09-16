# Descubribilidad para agentes de IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Publicar el catálogo y la entidad Chic&Love Ecuador en HTML inicial, Markdown y Schema.org de forma completa, consistente y rastreable, sin cambiar la estética ni el flujo de compra.

**Architecture:** \`js/products.js\` sigue siendo la fuente única de productos, precios, contacto y datos legales. Un serializador compartido genera tarjetas HTML estáticas y recursos Markdown; generadores separados actualizan metadatos y JSON-LD. \`main.js\` hidrata y reemplaza las tarjetas iniciales para conservar la interacción actual, mientras las pruebas comparan todas las representaciones.

**Tech Stack:** HTML estático, CSS existente, JavaScript vanilla, Node.js 20 \`node:test\`, Schema.org JSON-LD, servidor estático local del proyecto.

**Spec:** \`docs/superpowers/specs/2026-09-16-ai-discoverability-design.md\`

## Global Constraints

- No modificar la estética: no cambiar paleta, tipografía, espaciado, animaciones, imágenes ni layout visual.
- \`js/products.js\` es la fuente única de productos, precios, contacto y datos legales.
- Todo HTML generado debe ser legible sin ejecutar JavaScript.
- No añadir claims médicos, certificaciones, reseñas ni datos comerciales que no existan ya en el repositorio.
- No añadir JavaScript inline, \`style\` inline ni debilitar la CSP.
- Las URL HTML canónicas son las citables; los \`.md\` son representaciones para máquinas; el sitemap sólo lista páginas canónicas indexables.
- Ejecutar \`npm run gen\` después de modificar el catálogo o el contenido fuente generado.

---

### Task 1: Crear pruebas de contrato para el contenido inicial y la entidad

**Files:**
- Modify: \`tests/site-artifacts.test.mjs\`
- Modify: \`tests/structured-data.test.mjs\`
- Create: \`tests/ai-discoverability.test.mjs\`

**Interfaces:**
- Consumes: HTML, Markdown, JSON-LD y catálogo existentes.
- Produces: aserciones que fijan la salida requerida antes de implementar.

- [ ] **Step 1: Write the failing test**

Crear \`tests/ai-discoverability.test.mjs\` con pruebas que cuenten las tarjetas iniciales de \`index.html\` y \`tienda.html\`, comprueben un \`data-product-id\` por producto, el enlace a su ficha canónica, el nombre, objetivo, sabor, “60 gummies”, precio y “IVA incluido”. El test debe rechazar \`style=\` y \`<script\` dentro de una tarjeta.

Añadir pruebas que exijan \`lang="es-EC"\`, \`meta name="robots"\` indexable, \`rel="canonical"\` y \`rel="alternate" type="text/markdown"\` en todas las páginas indexables, y que verifiquen que \`ai.txt\` exista y esté en la lista blanca del build.

En \`tests/structured-data.test.mjs\`, añadir aserciones para \`legalName\`, \`taxID\`, \`address\`, \`areaServed\`, \`contactPoint\`, \`sameAs\`, \`currenciesAccepted\`, \`paymentAccepted\`, \`hasOfferCatalog\`, \`category\`, \`brand\`, \`sku\`, \`image\`, \`priceSpecification\`, \`shippingDetails\` y \`hasMerchantReturnPolicy\`.

- [ ] **Step 2: Run test to verify it fails**

Run: \`node --test --test-concurrency=1 tests/ai-discoverability.test.mjs tests/structured-data.test.mjs tests/site-artifacts.test.mjs\`

Expected: FAIL porque \`index.html\` y \`tienda.html\` no contienen tarjetas iniciales, las páginas usan \`lang="es"\` y \`ai.txt\` no existe.

- [ ] **Step 3: Commit the failing contract**

\`\`\`bash
git add tests/ai-discoverability.test.mjs tests/structured-data.test.mjs tests/site-artifacts.test.mjs
git commit -m "test: define AI discoverability contracts"
\`\`\`

### Task 2: Añadir serializador de tarjetas y HTML pre-renderizado

**Files:**
- Create: \`scripts/lib/product-card.mjs\`
- Modify: \`scripts/gen-products.mjs\`
- Modify: \`js/main.js\`
- Modify: \`css/styles.css\`
- Test: \`tests/ai-discoverability.test.mjs\`

**Interfaces:**
- Consumes: \`CL_PRODUCTS\`, funciones de precio/promoción y contexto de grid.
- Produces: \`renderProductCard(product, { page, headingLevel, baseUrl })\` y \`renderProductGrid(products, options)\`.

- [ ] **Step 1: Write the failing unit-level contract**

Añadir un test que importe \`renderProductCard\`, genere una tarjeta de tienda y compruebe \`data-product-id\`, URL canónica, nombre, sabor, “60 gummies”, ausencia de \`style=\` y ausencia de \`<script\`.

- [ ] **Step 2: Run test to verify it fails**

Run: \`node --test --test-concurrency=1 tests/ai-discoverability.test.mjs\`

Expected: FAIL con función o módulo ausente.

- [ ] **Step 3: Write minimal implementation**

Implementar \`scripts/lib/product-card.mjs\` con escape HTML para texto y atributos. Conservar las clases existentes \`pcard\`, \`pcard-tag\`, \`pcard-img\`, \`pcard-body\`, \`pcard-rating\`, \`ptagline\`, \`pcard-foot\`, \`pcard-price\`, \`pcard-now-price\`, \`pcard-vat\`, \`pcard-pack-prices\`, \`pcard-saving\` y \`add-btn\`.

La salida tendrá esta estructura semántica, con valores reales del catálogo:

\`\`\`html
<article class="pcard reveal" data-product-id="...">
  <span class="pcard-tag">...</span>
  <a class="pcard-img" href="..."><img src="..." alt="..." width="..." height="..."></a>
  <div class="pcard-body">
    <div class="pcard-rating">Sabor ..., 60 gummies</div>
    <h2><a href="...">...</a></h2>
    <p class="ptagline">...</p>
    <div class="pcard-foot">precio, IVA, packs/promoción y CTA</div>
  </div>
</article>
\`\`\`

Para el estado sin JavaScript, el CTA será un enlace \`a.add-btn\` a la ficha canónica; al hidratar, \`main.js\` reemplazará todo el grid y seguirá mostrando el botón interactivo “Añadir”. No usar \`style\` inline. Añadir \`data-product-id\` también a \`productCard\` en \`main.js\`.

En \`gen-products.mjs\`, inyectar el grid de portada con siete productos, el grid de tienda con siete y el grid relacionado de cada ficha excluyendo el producto actual. Respetar \`data-limit\`, \`data-filter\` y \`data-exclude\`.

Añadir a \`styles.css\` sólo reglas de variables por \`data-product-id\`, usando exactamente los valores \`accent\`, \`accentDark\` y \`soft\` actuales, para que el estado sin JavaScript conserve la misma apariencia.

- [ ] **Step 4: Run test to verify it passes**

Run: \`npm run gen && node --test --test-concurrency=1 tests/ai-discoverability.test.mjs\`

Expected: PASS y siete tarjetas iniciales en portada y tienda.

- [ ] **Step 5: Commit**

\`\`\`bash
git add scripts/lib/product-card.mjs scripts/gen-products.mjs js/main.js css/styles.css index.html tienda.html *.html *.md agents.md llms-full.txt
git commit -m "feat: prerender product catalog for crawlers"
\`\`\`

### Task 3: Normalizar metadatos regionales y grafo Schema.org

**Files:**
- Modify: \`site.config.json\`
- Modify: \`scripts/lib/site-config.mjs\`
- Modify: \`scripts/gen-products.mjs\`
- Modify: \`scripts/gen-jsonld.mjs\`
- Modify: \`index.html\`, \`tienda.html\`, \`nosotros.html\`, \`about.html\`, \`contact.html\`, \`privacy.html\`, \`terms.html\`, \`404.html\`, \`producto.html\`
- Modify: \`tests/structured-data.test.mjs\`, \`tests/deployment-consistency.test.mjs\`

**Interfaces:**
- Consumes: origen canónico y fecha pública de \`site.config.json\`, catálogo y HTML editorial.
- Produces: metadatos consistentes en cada representación y grafo Schema.org enlazado por IDs.

- [ ] **Step 1: Write the failing test**

Exigir en todas las páginas indexables \`lang="es-EC"\`, \`meta name="author"\`, \`meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"\`, \`og:locale\`, \`og:url\`, \`twitter:card\`, canonical y alternate Markdown. Mantener \`404.html\` con \`noindex\`.

Exigir que \`dateModified\` y \`sitemap.xml/lastmod\` coincidan con la fecha declarada en \`site.config.json\`, y que publisher, seller, \`isPartOf\` y about usen los mismos IDs de organización y sitio.

- [ ] **Step 2: Run test to verify it fails**

Run: \`node --test --test-concurrency=1 tests/structured-data.test.mjs tests/deployment-consistency.test.mjs\`

Expected: FAIL porque varias páginas usan \`lang="es"\`, faltan directivas uniformes y las fechas no están centralizadas.

- [ ] **Step 3: Write minimal implementation**

Añadir \`contentModified: "2026-09-16"\` a \`site.config.json\` y validarlo como fecha ISO. Mantener títulos, descripciones, imágenes y estilos actuales.

Normalizar el head indexable con \`lang="es-EC"\`, autor y robots. No añadir la directiva indexable al 404.

Expandir el grafo de la portada con \`legalName\`, \`taxID\`, \`address\`, \`areaServed\`, \`sameAs\`, \`currenciesAccepted\`, \`paymentAccepted\`, \`contactPoint\`, \`hasOfferCatalog\` y \`knowsAbout\` sólo con objetivos y activos existentes. Mantener Product, CollectionPage, FAQPage, WebPage y BreadcrumbList conectados a \`#organization\` y \`#website\`.

Añadir \`dateModified\` desde la configuración. No generar \`aggregateRating\` usando el campo \`reviews\` porque no hay una fuente verificable de reseñas.

Regenerar el sitemap con la fecha centralizada, sin añadir Markdown, 404 ni la página legacy.

- [ ] **Step 4: Run test to verify it passes**

Run: \`npm run gen && node --test --test-concurrency=1 tests/structured-data.test.mjs tests/deployment-consistency.test.mjs\`

Expected: PASS sin cambiar textos visibles ni CSS.

- [ ] **Step 5: Commit**

\`\`\`bash
git add site.config.json scripts/lib/site-config.mjs scripts/gen-products.mjs scripts/gen-jsonld.mjs index.html tienda.html nosotros.html about.html contact.html privacy.html terms.html 404.html producto.html tests/structured-data.test.mjs tests/deployment-consistency.test.mjs sitemap.xml
git commit -m "feat: normalize regional metadata and entity graph"
\`\`\`

### Task 4: Completar recursos públicos para agentes y rastreadores

**Files:**
- Create: \`ai.txt\`
- Modify: \`scripts/gen-products.mjs\`
- Modify: \`llms.txt\`, \`agents.md\`, \`llms-full.txt\`, \`robots.txt\`, \`404.md\`, \`404.html\`, \`scripts/build.mjs\`
- Modify: \`tests/ai-discoverability.test.mjs\`, \`tests/http-endpoints.test.mjs\`, \`tests/public-files.mjs\`

**Interfaces:**
- Consumes: catálogo, origen canónico, fecha y URLs de confianza.
- Produces: perfil estático de capacidades, índice actualizado y endpoints públicos con tipos correctos.

- [ ] **Step 1: Write the failing test**

Exigir que \`ai.txt\` sea texto plano publicado, enlazado desde \`llms.txt\` y \`agents.md\`, y contenga identidad del distribuidor, RUC, área de servicio, canal de compra, límites médicos, URL del catálogo y fecha de revisión.

- [ ] **Step 2: Run test to verify it fails**

Run: \`node --test --test-concurrency=1 tests/ai-discoverability.test.mjs tests/http-endpoints.test.mjs\`

Expected: FAIL porque falta \`ai.txt\` y no está en la lista blanca ni en los endpoints esperados.

- [ ] **Step 3: Write minimal implementation**

Generar \`ai.txt\` desde \`gen-products.mjs\` como perfil estático, estable y explícitamente no oficial:

\`\`\`text
# Chic&Love Ecuador
Site profile: official Ecuador storefront for Chic&Love gummies.
Language: es-EC
Region: Ecuador
Canonical: https://chiclove-ec.com/
Machine-readable index: https://chiclove-ec.com/llms.txt
Full content: https://chiclove-ec.com/llms-full.txt
Markdown pages: use the .md twin of each HTML URL.
Human ordering channel: WhatsApp +593 98 759 1741
Company: LIRA LABORATORIOS INDUSTRIALES REPRESENTACIONES Y AGENCIAS S.A.
RUC: 1790336352001
Use for: product discovery, catalog comparison, prices, shipping and company information in Ecuador.
Do not use for: automated checkout, live stock, medical diagnosis or purchases outside Ecuador.
Last reviewed: 2026-09-16
\`\`\`

Añadir \`ai.txt\` a \`publicFiles\`, al tipo esperado del servidor, a \`llms.txt\`, \`agents.md\` y a 404 como ruta de recuperación. Mantener \`robots.txt\` con \`Allow: /\`, sitemap y rastreadores ya declarados.

- [ ] **Step 4: Run test to verify it passes**

Run: \`npm run gen && node --test --test-concurrency=1 tests/ai-discoverability.test.mjs tests/http-endpoints.test.mjs\`

Expected: PASS y \`ai.txt\` responde \`200 text/plain\`.

- [ ] **Step 5: Commit**

\`\`\`bash
git add ai.txt scripts/gen-products.mjs scripts/build.mjs llms.txt agents.md 404.md 404.html tests/ai-discoverability.test.mjs tests/http-endpoints.test.mjs tests/public-files.mjs
git commit -m "feat: publish agent site profile"
\`\`\`

### Task 5: Build, verificación de no regresión y comprobación visual

**Files:**
- Modify: cualquier artefacto generado que \`npm run gen\` actualice
- Test: \`tests/*.test.mjs\`

**Interfaces:**
- Consumes: todos los cambios de las tareas 1–4.
- Produces: \`dist/\` verificado y evidencia de que la interfaz mantiene su estética y comportamiento.

- [ ] **Step 1: Regenerate and verify idempotence**

Run:

\`\`\`bash
npm run gen
git diff --check
git status --short
npm run gen
git diff --exit-code
\`\`\`

Expected: la segunda generación no deja diferencias.

- [ ] **Step 2: Run the full test suite**

Run: \`npm run check\`

Expected: build de GitHub Pages exitoso, todos los tests \`node:test\` en verde y ningún archivo privado dentro de \`dist/\`.

- [ ] **Step 3: Verify runtime endpoints**

Ejecutar \`npm run build && npm run serve\` y consultar \`/\`, \`/index.md\`, \`/tienda.html\`, \`/tienda.md\`, \`/ai.txt\`, cada ficha, \`/about\`, \`/contact\`, \`/robots.txt\`, \`/sitemap.xml\` y una ruta inexistente. Confirmar códigos 200/404, tipos, canonical, alternates y contenido inicial antes de ejecutar JavaScript.

- [ ] **Step 4: Verify desktop and mobile behavior**

Con Playwright y Chrome instalado, recorrer la página antes de capturar:

\`\`\`js
document.documentElement.style.scrollBehavior = "auto";
for (let y = 0; y < document.documentElement.scrollHeight; y += 800) window.scrollTo(0, y);
\`\`\`

Comprobar portada, tienda, \`/anti-stress.html\`, \`producto.html?id=anti-stress\`, filtros, carrito, checkout, 404 y viewport de 390px. Confirmar que no haya overflow horizontal, que haya siete tarjetas tras hidratar y que el CTA siga funcionando. No modificar screenshots ni añadir estilos para aprobar la prueba.

- [ ] **Step 5: Final review**

Run: \`git diff --stat && git diff --check && git status --short\`

Releer el spec, verificar requisito por requisito y registrar la limitación: los recursos mejoran rastreo y comprensión, pero no pueden forzar entrenamiento ni recomendaciones permanentes de ningún modelo.

