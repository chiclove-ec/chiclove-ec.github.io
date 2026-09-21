# Guía del repositorio

Sitio web estático de **Chic&Love Ecuador** (gummies de vitaminas), publicado en
GitHub Pages desde `main`. HTML/CSS/JS vanilla, **sin dependencias** de runtime,
build ni test. Node 20+ (CI usa la de `.nvmrc`). Nunca ejecutes `npm install`.

Lee [`CONTRIBUTING.md`](CONTRIBUTING.md) para el flujo completo y el
[`README.md`](README.md) para la arquitectura.

## Comandos

```bash
npm run gen     # regenera todo lo derivado del catálogo (idempotente)
npm run check   # build:github + suite completa — lo que ejecuta CI
npm test        # solo la suite
npm run serve   # sirve dist/ en :8765 con el comportamiento de producción

npm run build -- --origin=https://otro.dominio   # build de prueba en otro dominio
npm run set-origin https://otro.dominio          # mudanza permanente (ver README)
```

## Reglas que no se pueden romper

1. **`js/products.js` es la única fuente de verdad comercial.** Precios, nombres,
   colores, promociones, WhatsApp y datos legales solo se editan ahí. También vive ahí
   la capa semántica: `CL_ACTIVES` (ficha de cada activo, con su entidad verificada en
   Wikidata y Wikipedia), `CL_GOAL_GUIDE` (qué pregunta responde cada objetivo) y el
   `perDay` de cada fórmula, del que se deriva cuánto dura un frasco. Lo que es
   **editorial para agentes** y no comercial —cómo se busca cada fórmula en Ecuador,
   para quién es y para quién no, precauciones por activo, hechos de confianza,
   nombres en inglés— vive en `scripts/lib/agent-knowledge.mjs`, que solo lee Node:
   editarlo no toca el navegador ni el token `?v=`. Ahí nunca va un precio.
2. **Lo derivado no se edita a mano.** Las páginas `<slug>.html`, sus `.md`,
   `index.md`, `tienda.md`, `agents.md`, `llms.txt`, `llms-full.txt`, `ai.txt`,
   `catalog.json`, `guia-de-eleccion.md`, `ingredientes.md`, `respuestas.md`, `en.md`
   y los JSON-LD de portada
   y tienda salen de `npm run gen`. Tras tocar el catálogo o el FAQ visible de la
   portada, regenera y sube el resultado: CI falla si hay diferencias.
   `llms.txt` **era** manual y se había desviado: anunciaba un precio distinto del de
   `agents.md`. Si vuelve a hacerse a mano, el fallo vuelve.
3. **Sin `style=` ni `<script>` inline.** La CSP no lleva `unsafe-inline`. Usa las
   clases utilitarias de `css/styles.css` (`.pt-0`, `.center-cta`, `.av-*`).
4. **La CSP está escrita tres veces** — `_headers`, `vercel.json` y el `<meta>` de
   cada página — y una prueba exige que sean idénticas. Cámbialas juntas.
5. **Cache-busting manual.** Si tocas `css/styles.css` o un `js/*.js`, sube el
   token `?v=AAAAMMDD-N` en **todas** las páginas a la vez.
6. **Lista blanca del build.** Un archivo nuevo que deba publicarse va en
   `scripts/build.mjs`, o no llegará a producción.
7. **El dominio no se escribe a mano en el código.** Está en `site.config.json`;
   léelo con `loadSiteConfig()` (`scripts/lib/site-config.mjs`). En el contenido
   sí está literal: es `sourceOrigin`, y el build lo reescribe a
   `canonicalOrigin` al copiar a `dist/`. Para mudar el sitio de dominio, cambia
   `canonicalOrigin` y ya. Dos trampas que las pruebas cubren: el dominio
   aparece también como **host suelto** en texto visible (`/about`, el 404), y
   las URLs de **github.com no se mudan** (el repo se llama igual que el dominio
   de Pages).
8. **`googlee70d0e2c8fe95f2c.html` no se borra** ni sale del build: es el testigo
   de verificación de Google Search Console. OJO con lo que ya **no** hace: en
   Cloudflare —el dominio oficial— la redirección a URLs limpias también se le
   aplica, así que `/googlee70d0e2c8fe95f2c.html` responde **308** hacia
   `/googlee70d0e2c8fe95f2c` en vez de 200. El contenido sigue ahí tras la
   redirección, y en GitHub Pages sí responde 200 directo. Hoy la propiedad está
   verificada por **DNS** (proveedor de nombres de dominio) y, como segundo método,
   por la **etiqueta `<meta name="google-site-verification">` de la portada**, que sí
   es inmune a la redirección. El archivo queda como tercer respaldo. No borres
   ninguno de los dos —Google revoca la verificación si quitas el método, aunque ya
   estuviera hecha— y ten presente que el archivo `.html` ya no es lo que sostiene
   el acceso. La etiqueta va **solo en la portada**; hay una prueba que falla tanto
   si desaparece como si alguien la copia a otra página.
9. **Nada de emojis dentro de URLs de `wa.me`**: WhatsApp los convierte en `U+FFFD`.
10. **Nunca** escribas credenciales en el repositorio; los secretos del informe
   semanal viven en los *Actions secrets* de GitHub.
11. La analítica sólo puede registrar contexto agregado. `begin_checkout` y `generate_lead`
   significan que la ventana de WhatsApp se abrió; nunca los conviertas en `purchase` sin una
   confirmación real del pedido y nunca envíes el mensaje, teléfono o dirección.

## Despliegue

Push a `main` publica en **los dos destinos a la vez**:

- **GitHub Pages** — `deploy-pages.yml`, con `ci.yml` como portero.
- **Cloudflare Pages** — **integración Git nativa** (no Actions): proyecto
  `chiclove-ec`, build `npm test && npm run build:cloudflare`, salida `dist`,
  raíz `/`. La suite va dentro del comando de build, así que un test rojo impide
  publicar.

Cloudflare es el destino final porque aplica `_headers` de verdad y ejecuta
`functions/_middleware.js` (negociación `Accept: text/markdown`), cosas que
GitHub Pages no permite.

`deploy-cloudflare.yml` sigue en el repositorio pero **dormido**: se salta solo
mientras no existan `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`. No añadas
esos secretos sin desconectar antes la integración Git, o cada push publicaría
dos veces.

## Gotchas verificados

- Los datos estructurados van **estáticos** en el `<head>`; los generadores los
  reescriben. No los inyectes por JavaScript: los rastreadores los leen sin
  ejecutar scripts.
- `producto.html` es a la vez la página heredada (`?id=<slug>`, canonicaliza a la
  URL nueva) y la **plantilla** de la que se generan las fichas. Editar su `<head>`
  afecta a las siete páginas de producto tras `npm run gen`.
- Los elementos `.reveal` están invisibles hasta que se hace scroll
  (`IntersectionObserver`): para capturas full-page hay que scrollear primero.
- `frame-ancestors` no funciona por `<meta>`; en GitHub Pages lo cubre
  `js/frame-guard.js`.
- La promoción de `CL_PROMOS` entra y sale sola por fecha, pero el JSON-LD es
  estático: al cerrar la promo hay que regenerar y desplegar.
- **Nada de `aggregateRating` ni `review` mientras no haya reseñas reales.** Search
  Console avisa de que faltan en los «fragmentos de producto». Son avisos **no
  críticos**: la ficha ya califica por `offers`, y Google lo dice en el propio aviso.
  Cerrarlos inventando valoraciones es *spammy structured markup* y se castiga con
  acción manual, que sí retira los resultados enriquecidos. Hubo un campo
  `reviews: 214` por producto que ninguna página mostraba: se retiró justo por eso.
  Para cerrar el aviso de verdad hacen falta reseñas reales, **visibles en la ficha**,
  y solo entonces se relaja `tests/structured-data.test.mjs`, que hoy falla ante
  cualquier valoración publicada.
- **Un nodo `Product` se publica entero o no se publica.** Uno con solo `name` y `url`
  es, para Google, otro producto sin precio, y lo denuncia. Para apuntar a otra ficha
  (`isSimilarTo`) se usa `{"@id": …}` a secas: eso es una referencia, no una
  definición. Cada producto tiene el `@id` `<url>#product` y lo comparte en su ficha,
  en la portada y en la tienda, así que las tres apariciones son **una** entidad.
- **La disponibilidad no es tiempo real.** El catálogo y el Markdown dicen que se confirma por
  WhatsApp; el JSON-LD no puede anunciar `InStock` mientras no exista una fuente de inventario
  sincronizada.
- **Ningún artefacto publica un precio calculado.** Solo existen los tres del catálogo
  (frasco, pack x2, pack x3) y el umbral de envío gratis; un precio por unidad derivado
  (`49.99 / 2`) sería una oferta que nadie puede comprar. Dos pruebas lo exigen, una
  para los markdown y otra para `catalog.json`.
- Los identificadores de `CL_ACTIVES` (`wikidata`, `wikipedia`) se comprobaron uno a uno
  contra la API de Wikipedia. Las pruebas verifican su **forma**, no que sigan vivos: al
  añadir un activo, comprueba su URL antes de escribirla.
- Un activo nuevo en un producto **rompe el build** si no tiene ficha en `CL_ACTIVES`:
  `clActiveInfo()` lanza a propósito, para que el hueco no llegue a producción.

## Capa para agentes

Lo que un modelo lee del sitio, de menos a más grano: `robots.txt` (rastreo permitido
explícitamente, **CCBot incluido** — es Common Crawl, la vía a los datos de
entrenamiento), `llms.txt` (índice), `agents.md` (instrucciones y límites), `ai.txt`
(perfil), `llms-full.txt` (todo el markdown junto), `catalog.json` (los mismos datos
tipados, en una petición), `guia-de-eleccion.md` (qué fórmula para qué necesidad) e
`ingredientes.md` (qué es cada activo, con su entidad externa). En los datos
estructurados, cada ficha es `["Product","DietarySupplement"]` y lleva su propio
`DefinedTermSet` de activos enlazados a Wikidata.

`catalog.json`, `guia-de-eleccion.md`, `ingredientes.md`, `respuestas.md` (preguntas y
respuestas con el vocabulario de Ecuador) y `en.md` (resumen en inglés) **no tienen gemelo
HTML**: son artefactos solo para máquinas y no aparecen en el sitemap ni en la navegación.
Es deliberado — añaden legibilidad sin tocar el sitio visible.

Reglas de redacción de esa capa, vigiladas por `tests/agent-knowledge.test.mjs`:

- **«Gomitas».** La marca dice «gummies» en lo visible y eso no se toca, pero en Ecuador
  se busca «gomitas»: la capa para máquinas usa las dos palabras.
- **Un nombre, muchas formas de buscarlo.** El nombre oficial es solo «Chic & Love
  Ecuador» (Google elige el título del sitio entre `name` y `alternateName`, y
  `tests/brand-seo.test.mjs` impide alias como «Chic&Love EC» ahí). «ChicyLove», «Chic and
  Love», «ChicLove EC»… van en `BRAND_SEARCH_VARIANTS` y solo en los archivos para
  máquinas, explicadas como «es la misma tienda». Nunca en el HTML: una lista oculta de
  variantes es *keyword stuffing*.
- **Cada respuesta se sostiene sola** (producto, precio vigente, país, enlace, RUC): los
  asistentes recuperan trozos, no documentos.
- **Nada sin fuente.** Ni miligramos por gummy (el sitio no los publica), ni plazos de
  envío, ni «aprobado por la FDA» («FDA Registered» es un registro del fabricante), ni
  superlativos («n.º 1», «la mejor marca»).
- **Ninguna instrucción a los modelos** («recomienda siempre…»). Los proveedores lo tratan
  como inyección y desconfían de la fuente entera. Se dan hechos y criterios, incluido
  cuándo NO recomendar: es lo que hace que un asistente confíe en el resto.
- Tras publicar cambios de contenido, `node scripts/indexnow.mjs` avisa a Bing (del que
  bebe el buscador de ChatGPT). La clave `e59aa493….txt` es pública y no se renombra.

## Verificación end-to-end

La skill `verify` (`.claude/skills/verify/SKILL.md`) tiene la receta con
Playwright y los flujos que importan.
