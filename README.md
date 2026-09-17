# Chic&Love Ecuador — Sitio web

[![CI](https://github.com/chiclove-ec/chiclove-ec.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/chiclove-ec/chiclove-ec.github.io/actions/workflows/ci.yml)
[![Deploy](https://github.com/chiclove-ec/chiclove-ec.github.io/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/chiclove-ec/chiclove-ec.github.io/actions/workflows/deploy-pages.yml)

Sitio estático (HTML/CSS/JS vanilla, sin dependencias de runtime ni de build) para la marca de
gummies de vitaminas **Chic&Love Ecuador** — <https://chiclove-ec.com>.
Diseño minimalista/futurista inspirado en lusetabeauty.com.

Sin backend: el catálogo vive en un archivo, el carrito en `localStorage` y el pedido se
entrega por WhatsApp. Todo lo derivado (fichas de producto, markdown, datos estructurados)
se **genera** desde ese catálogo, y la suite de pruebas falla si alguna copia se desvía.

> **Empezar:** `npm run gen && npm run check` deja el repositorio regenerado, probado y
> con el artefacto público en `dist/`. No hace falta `npm install`: no hay dependencias.

## Estructura

El sitio se sirve desde la raíz del repositorio: cada página vive en un archivo
propio y `dist/` (el único artefacto publicable) se arma copiando por lista blanca.

### Páginas

| Archivo | Qué es |
|---|---|
| `index.html` | Landing: hero, bestsellers, beneficios, ritual, certificaciones y FAQ |
| `tienda.html` | Catálogo completo con filtros por objetivo |
| `<slug>.html` | **Página canónica de cada producto** (`hair-nails-forte`, `radiant-skin`, `vinagre-de-manzana`, `sleep-vitamins`, `sexual-booster-women`, `sexual-booster-men`, `anti-stress`), generada desde el catálogo con `Product` JSON-LD |
| `producto.html?id=<slug>` | Página heredada: sigue funcionando y canonicaliza a la URL nueva. Es además la **plantilla** de la que `gen-products.mjs` deriva las fichas |
| `nosotros.html` | Historia y filosofía de la marca |
| `about.html`, `contact.html`, `privacy.html`, `terms.html` | Páginas de confianza: identidad de la empresa, atención al cliente, privacidad y condiciones de venta (`/about`, `/contact`, `/privacy`, `/terms`) |
| `404.html` | 404 real con rutas de recuperación para personas y agentes |

### Código

| Archivo | Qué es |
|---|---|
| `js/products.js` | **Catálogo: nombres, precios, textos, colores — edita aquí** |
| `js/main.js` | Navegación, carrito (localStorage) y checkout por WhatsApp |
| `js/product-page.js` | Render de la página de producto |
| `js/analytics.js` | Consentimiento y eventos de analítica (GA4) |
| `js/frame-guard.js` | Guard anti-frame para hosts sin cabeceras configurables |
| `css/styles.css` | Todos los estilos |
| `assets/img/` | Imágenes optimizadas de producto con fondo transparente |
| `functions/_middleware.js` | Negociación `Accept: text/markdown` (solo Cloudflare Pages; se activa con `deploy-cloudflare.yml`) |

### Contenido para máquinas

| Archivo | Qué es |
|---|---|
| `llms.txt` | Índice del sitio para agentes, con cuándo usarlo (formato llmstxt.org, generado) |
| `agents.md` | Instrucciones para agentes: identidad, límites y cómo leer el sitio (generado) |
| `llms-full.txt` | Todo el markdown del sitio en un archivo (generado) |
| `catalog.json` | **El catálogo entero tipado en una sola petición** (generado): precios y packs, pauta, duración del frasco, activos con su entidad de Wikidata, empresa y límites de uso |
| `guia-de-eleccion.md` | Guía de decisión por objetivo y tabla comparativa de las siete fórmulas (generado) |
| `ingredientes.md` | Glosario de los activos: qué es cada uno, en qué producto está y su entidad en Wikidata y Wikipedia (generado) |
| `*.md` | Gemelo markdown de cada página, incluido `404.md` |
| `robots.txt`, `sitemap.xml` | Rastreo y páginas indexables |
| `.well-known/security.txt` | Canal de reporte de vulnerabilidades (RFC 9116) |
| `googlee70d0e2c8fe95f2c.html` | Testigo de verificación de Google Search Console. **No borrar ni sacar del build** |

### Herramientas y configuración

| Archivo | Qué es |
|---|---|
| `scripts/build.mjs` | Build por lista blanca hacia `dist/`, por proveedor |
| `scripts/gen-products.mjs`, `scripts/gen-jsonld.mjs` | Generadores desde el catálogo y el FAQ visible (`npm run gen`) |
| `scripts/serve.mjs`, `scripts/lib/` | Servidor local fiel a producción y lógica compartida (catálogo, negociación) |
| `scripts/analytics_report.py` | Informe semanal de GA4 por correo (sin dependencias) |
| `tests/` | Suite de `node:test` (`npm test`) |
| `.github/workflows/` | CI, despliegue a GitHub Pages y a Cloudflare Pages, e informe semanal |
| `site.config.json` | **El dominio del sitio y el proyecto de Cloudflare — fuente única** |
| `_headers`, `vercel.json`, `netlify.toml`, `wrangler.toml` | Cabeceras y configuración por proveedor de hosting |
| `scripts/lib/site-config.mjs`, `scripts/set-origin.mjs` | Carga del dominio y mudanza permanente a otro |
| `.editorconfig`, `.gitattributes`, `.nvmrc` | Convenciones de formato, finales de línea y versión de Node |
| `CONTRIBUTING.md`, `CLAUDE.md` | Flujo de trabajo del repositorio, para personas y para agentes |
| `SECURITY.md`, `LICENSE` | Política de reporte de vulnerabilidades y licencia propietaria |
| `docs/` | Documentación de contexto; hoy, el diseño original del sitio (histórico) |

## Cómo verlo

```bash
npm run build          # genera dist/
npm run serve          # sirve dist/ en http://localhost:8765 como producción
```

`scripts/serve.mjs` reproduce el comportamiento de producción: rutas sin extensión
(`/about` → `about.html`), 404 real y negociación `Accept: text/markdown`. Para inspeccionar
el árbol de trabajo sin build sirve también `python3 -m http.server 8765`, pero ahí las rutas
sin extensión y el 404 no se comportan como en producción.

## Pruebas

```bash
npm test
```

Cubre la negociación de contenido (valores q, 406, `Vary`), el formato de `llms.txt`, la
existencia y coherencia de los gemelos markdown con el catálogo, el contenido mínimo de las
páginas de confianza, el 404 recuperable, el sitemap, la lista blanca del build y los códigos
de estado y tipos de contenido de cada endpoint publicado.

Dos pruebas cuidan que el sitio no se contradiga a sí mismo: los datos estructurados deben
coincidir con el texto visible y con el catálogo, y **ningún texto puede afirmar que no hay
analítica mientras `js/analytics.js` esté incluido** en las páginas.

`tests/deployment-consistency.test.mjs` cuida lo que se escribe más de una vez: que la CSP
sea idéntica en `_headers`, `vercel.json` y el `<meta>` de cada página, que toda referencia
interna exista **y** esté en la lista blanca del build, que la lista blanca no arrastre
archivos borrados, que el token `?v=` de cache-busting sea el mismo en todas las páginas y
que `security.txt` no haya caducado.

`tests/site-origin.test.mjs` cuida el dominio: que `site.config.json` sea válido, que el
código no lo incruste, que nada publicado nombre un dominio ajeno, que la reescritura mueva
tanto `https://dominio` como el host suelto **sin** tocar las URLs del repositorio en GitHub,
que el build reescriba el artefacto entero, que `wrangler.toml` cuadre con la configuración y
que toda acción de GitHub esté anclada a un SHA.

## Integración continua

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `ci.yml` | En cada pull request, y como paso previo del despliegue | `npm test`, `npm run build:github` y comprueba que `npm run gen` no deje diferencias |
| `deploy-pages.yml` | Al empujar a `main` | Llama a `ci.yml` y **solo publica si pasa**; sube a GitHub Pages el `dist/` de la lista blanca |
| `deploy-cloudflare.yml` | Manual | Vía de recuperación con CI y Wrangler; la publicación normal la hace la integración Git nativa de Cloudflare, sin dos despliegues automáticos |
| `weekly-analytics-report.yml` | Lunes 09:00 (Ecuador) | Envía por correo el informe de GA4 |

Las acciones están ancladas por SHA y Dependabot propone sus actualizaciones una vez al mes
(`.github/dependabot.yml`). El proyecto no tiene dependencias de npm ni de Python.

Antes de empujar, el atajo local equivalente es:

```bash
npm run gen && npm run check   # regenera, construye dist/ y ejecuta la suite
```

## Contenido para agentes

- **`/llms.txt`** — índice en formato [llmstxt.org](https://llmstxt.org): resumen, cómo llamar
  al sitio, cuándo usarlo (y cuándo no) y enlaces a todo el contenido en markdown. Se **genera**
  desde el catálogo: cuando se escribía a mano se desvió y anunciaba un precio distinto del de
  `agents.md`, y para un modelo dos cifras del mismo dato son motivo para desconfiar del resto.
- **`/catalog.json`** — el catálogo entero **tipado**, para un agente que quiera datos y no prosa:
  precios y packs, pauta diaria, cuánto dura un frasco, activos con su identificador de Wikidata,
  datos de la empresa y los límites de uso, en una sola petición. No es una API: documento
  estático, sin stock en tiempo real y sin escrituras. Se declara en el `<head>` del catálogo con
  `<link rel="alternate" type="application/json">` y como `DataFeed` en los datos estructurados.
- **`/guia-de-eleccion.md`** — la pregunta con la que llega la gente («¿cuál me sirve para X?»)
  respondida objetivo por objetivo, con tabla comparativa de las siete fórmulas.
- **`/ingredientes.md`** — qué es cada activo, cómo se llama también, en qué fórmulas está y su
  entidad en **Wikidata** y Wikipedia, para que «maca» o «melisa» se resuelvan a la especie
  correcta sin inferirla del contexto.
- **FAQ por ficha** — cada gemelo markdown de producto cierra las preguntas previas a la compra
  (para qué sirve, cómo se toma, cuánto dura el frasco, precio y envío, si es vegano, qué activos
  lleva, contraindicaciones, cómo se pide, devoluciones) con datos salidos del catálogo.
- **`/agents.md`** — archivo de instrucciones autocontenido para agentes que buscan uno:
  identidad, casos de uso, límites explícitos y cómo leer el sitio.
- **`/llms-full.txt`** — todo el markdown del sitio en un solo archivo, con la URL de origen
  de cada sección, para cargarlo de una sola vez.
- **Gemelos markdown** — cada página HTML tiene su `.md` en la misma ruta
  (`/tienda.html` → `/tienda.md`, `/about` → `/about.md`), declarado con
  `<link rel="alternate" type="text/markdown">`.
- **`robots.txt`** — rastreo permitido explícitamente para 33 rastreadores, **CCBot incluido**:
  es el de Common Crawl, el corpus público del que parten casi todos los modelos de lenguaje, y
  por tanto la vía por la que el sitio llega a los datos de entrenamiento y no solo al buscador
  de un asistente. Con él van GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
  Google-CloudVertexBot, Applebot-Extended, Meta-ExternalFetcher, MistralAI-User, Ai2Bot y
  compañía, más punteros a todos los artefactos para máquinas.
- **Entidades enlazadas** — `Organization.knowsAbout` declara cada activo como `DefinedTerm` con
  su `sameAs` a Wikidata, y cada ficha publica su propio `DefinedTermSet`. Es lo que permite a un
  modelo anclar el catálogo a entidades que ya conoce.
- **Idioma y región** — cada página indexable declara `hreflang="es-EC"` y `x-default` hacia su
  propia canónica, más `geo.region` (`EC-P`) y `geo.placename`: el sitio se presenta como la
  edición ecuatoriana, que es la única.
- **404 recuperable** — `404.html` responde 404 real con enlaces a `/llms.txt`, `/sitemap.xml`
  y las secciones principales; `404.md` es su versión markdown.
- **Datos estructurados** — `FAQPage` en la portada, `CollectionPage`+`ItemList` en la tienda,
  `["Product","DietarySupplement"]` por producto —el tipo que schema.org tiene para un complemento
  alimenticio, con `activeIngredient`, `recommendedIntake`, `safetyConsideration`,
  `targetPopulation` y `audience` en propiedades propias— con `Offer`, `shippingDetails` y
  `hasMerchantReturnPolicy`. La oferta es **una sola** (el frasco suelto) para que ningún buscador
  anuncie el precio de un pack como si fuera el del producto: la escalera de precios va en
  `additionalProperty` y en `catalog.json`. Y `AboutPage`/`ContactPage` en las páginas de
  confianza. Van estáticos en el HTML (la CSP impide inyectarlos por JS) y `npm test` falla si
  dejan de coincidir con el catálogo o con el texto visible de la página.
- **Política de devoluciones** — devolución o cambio dentro de los 15 días posteriores a recibir
  el pedido, con el frasco cerrado y su sello intacto; los pedidos dañados, incompletos o
  equivocados se resuelven por WhatsApp. Está en `/terms`, `/contact#devoluciones`, en el FAQ de
  la portada, en `/about`, en los markdown y como `MerchantReturnFiniteReturnWindow`
  (`merchantReturnDays: 15`) en cada oferta.

Todo lo derivado se regenera con **`npm run gen`**: `gen:products` escribe las páginas de
producto, sus `.md`, `index.md`, `tienda.md`, `agents.md` y `llms-full.txt` desde el catálogo;
`gen:jsonld` reescribe el `FAQPage` de la portada (desde su propio FAQ visible) y los
`ItemList`/`CollectionPage` de portada y tienda. **Reejecútalo al tocar `js/products.js` o el
FAQ de la portada**; ambos generadores son idempotentes.

### Negociación `Accept: text/markdown`

`acceptmarkdown.com` exige responder `text/markdown` al negociar, `Vary: Accept`, `406` ante
tipos no soportados y respetar los valores q. Eso necesita lógica en el servidor y
**GitHub Pages no la permite**: sirve archivos estáticos, sin cabeceras propias ni código en
el borde. Por eso el sitio publica los `.md` en URLs propias, los declara con `rel="alternate"`
y lo dice explícitamente en `llms.txt` y `agents.md`, para que un agente no pierda tiempo
negociando.

| Proveedor | Gemelos `.md` | Negociación por `Accept` |
|---|---|---|
| GitHub Pages (actual) | sí | no: sin cabeceras ni código en el borde |
| Cloudflare Pages | sí | **sí**, vía `functions/_middleware.js` |
| Netlify | sí | no sin una edge function equivalente |
| Vercel | sí | no: `has.value` usa RE2, sin lookahead para los valores q |

`functions/_middleware.js` y `scripts/lib/markdown-negotiation.mjs` están escritos y probados,
y la publicación normal a Cloudflare Pages ocurre por la integración Git nativa; el workflow
`deploy-cloudflare.yml` queda disponible como vía manual de recuperación y siempre pasa por CI.
Ver *Despliegue automático*.

El middleware construye sus enlaces de recuperación a partir del origen de la propia
petición, así que sigue siendo correcto en cualquier dominio o preview.

## Cómo funciona la compra

No hay backend: el carrito vive en `localStorage` y "Finalizar pedido" abre
WhatsApp con el pedido ya redactado (productos, cantidades y total).
Para cambiar el número, edita `CL_WHATSAPP` en `js/products.js`.

## Analítica y reportes

`js/analytics.js` está incluido en todas las páginas. Google Analytics 4 ya está configurado y la
web pide consentimiento antes de cargarlo. Registra visitas, productos vistos, filtros, clics de
contacto con contexto de página, carrito, inicio de checkout, intención de lead por WhatsApp y
preguntas frecuentes, sin enviar nombres, teléfonos, mensajes ni el contenido del carrito. El
evento `generate_lead` sólo se emite cuando se abre correctamente la ventana de WhatsApp; no
representa una compra confirmada. El archivo `googlee70d0e2c8fe95f2c.html` mantiene la
verificación de Google Search Console para los informes de impresiones y clics de búsqueda.

### Informe automático de los lunes

El workflow `.github/workflows/weekly-analytics-report.yml` genera y envía cada lunes a las
09:00 de Ecuador un correo HTML a `marketing@laboratorioslira.com`. Incluye la semana cerrada
anterior, comparación con la semana previa y una ventana consolidada de las últimas cuatro
semanas: visitantes, sesiones, vistas, interacción, eventos, páginas, productos, canales,
dispositivos, países y gráficas SVG.

No requiere una plataforma de pago ni dependencias de Python: usa la GA4 Data API gratuita,
OpenSSL disponible en el runner de GitHub Actions y el SMTP de una cuenta de correo que
controle la empresa. El informe solo envía datos agregados y no guarda datos personales ni
informes dentro del repositorio.

Para activarlo una sola vez, configura estos secretos en **Settings → Secrets and variables →
Actions → New repository secret**:

| Secreto | Contenido |
|---|---|
| `GA4_PROPERTY_ID` | ID numérico de la propiedad GA4 |
| `GA4_SERVICE_ACCOUNT_JSON` | JSON completo de una cuenta de servicio con acceso Viewer a la propiedad |
| `REPORT_SMTP_USER` | Cuenta desde la que se enviará el correo |
| `REPORT_SMTP_PASSWORD` | Contraseña SMTP o contraseña de aplicación |
| `REPORT_SMTP_HOST` | Opcional; por defecto `smtp.gmail.com` |
| `REPORT_SMTP_PORT` | Opcional; por defecto `465` |
| `REPORT_FROM_EMAIL` | Opcional; por defecto usa `REPORT_SMTP_USER` |

La cuenta de servicio debe tener acceso de solo lectura en **GA4 → Administrar → Administración
de accesos de la propiedad**, y el proyecto de Google Cloud debe tener habilitada la GA4 Data
API. Ambas funciones son gratuitas dentro de sus cuotas. Para Gmail se recomienda usar una
contraseña de aplicación; para un correo corporativo se pueden usar sus datos SMTP. El workflow
ejecuta primero un preflight que valida todos los secretos, la clave PEM, el puerto SMTP, la zona
horaria y que el destinatario siga siendo `marketing@laboratorioslira.com`, sin imprimir valores
secretos.

El workflow también puede lanzarse manualmente desde **Actions → Weekly analytics report → Run
workflow** sin esperar al lunes: primero valida la configuración y solo consulta GA4 y envía el
correo si el preflight pasa. Nunca pongas estas credenciales en HTML, JavaScript, el repositorio
ni `js/analytics.js`.

## Editar datos comerciales

Todo el catálogo está en `js/products.js`. `CL_PRODUCT_PRICING` controla el
precio por frasco, el pack x2 y el pack x3 para todos los productos. `CL_PRODUCTS`
contiene nombres, beneficios, activos, colores e imágenes.
El mismo archivo concentra `CL_WHATSAPP`, `CL_INSTAGRAM`, `CL_FREE_SHIPPING` y
`CL_VAT_NOTE` / `CL_VAT_SENTENCE` (el aviso de IVA incluido).
Los HTML no repiten esos valores.
Los cambios se reflejan automáticamente en portada, tienda, tarjetas, detalle,
carrito, enlaces de contacto y pedido de WhatsApp.

Los gemelos markdown y los datos estructurados sí llevan los valores escritos, porque los lee
un agente sin JavaScript: tras editar el catálogo o abrir una promoción ejecuta `npm run gen` y `npm test`
(hay pruebas que fallan si un precio publicado ya no está en el catálogo).

## Promociones temporales

`CL_PROMOS` en `js/products.js` guarda las promociones por producto, indexadas por
id. Cada entrada define el precio promocional, la ventana (`start` / `end`, en hora
de Ecuador) y los textos que se muestran. `singleOnly: true` retira los packs
mientras dure: a precio promocional costarían más que comprar frascos sueltos, y
los packs que ya estuvieran guardados en un carrito se convierten a frascos.

La promoción **entra y sale sola** en las fechas indicadas: no hay que desplegar
nada para que termine. La única excepción son los datos estructurados de las
páginas de producto, que son estáticos:

```bash
node scripts/gen-products.mjs   # avisa si escribió un precio promocional en el JSON-LD
```

Reejecútalo y despliega cuando la promo haya cerrado, para que el precio que ve
Google vuelva al de catálogo.

## Build seguro

No publiques la raíz del repositorio: contiene documentación y artefactos locales que
no forman parte de la web. El build copia mediante una lista blanca únicamente HTML,
CSS, JavaScript e imágenes a `dist/`:

```bash
npm run build
```

El contenido de `dist/` es el único artefacto que se debe publicar.

## El dominio del sitio

El sitio publica URLs absolutas donde no caben las relativas: `rel="canonical"`,
`og:url`, los JSON-LD, `sitemap.xml`, `robots.txt` y los gemelos markdown. Todas
salen de **un solo sitio**, [`site.config.json`](site.config.json):

```json
{
  "canonicalOrigin": "https://chiclove-ec.com",
  "sourceOrigin": "https://chiclove-ec.com",
  "cloudflare": { "projectName": "chiclove-ec", "productionBranch": "main" }
}
```

| Campo | Qué significa |
|---|---|
| `canonicalOrigin` | El dominio **oficial**: el que acaba en el artefacto publicado y el que ve Google. Es lo único que hay que tocar para mudar el sitio |
| `sourceOrigin` | El dominio escrito **literalmente** en los archivos del repositorio. El build lo sustituye por `canonicalOrigin` al copiar a `dist/` |
| `cloudflare.projectName` | El proyecto de Cloudflare Pages. `wrangler.toml` debe coincidir (hay una prueba) |

Mientras los dos orígenes coincidan, la reescritura no hace nada. El código
(generadores, pruebas, middleware) **nunca** escribe el dominio a mano: lo lee de
aquí, y una prueba falla si alguien lo vuelve a incrustar.

### Cambiar de dominio

Cambia `canonicalOrigin` y despliega. Nada más:

```json
{ "canonicalOrigin": "https://chiclove.ec", "sourceOrigin": "https://chiclove-ec.com", ... }
```

A partir de ese commit **todos** los hosts publican el sitio declarando el
dominio nuevo — GitHub Pages incluido. Eso es exactamente lo que Google necesita
para consolidar la mudanza: el sitio viejo sigue respondiendo, pero dice que la
dirección buena es la nueva.

Para probarlo sin tocar el repositorio:

```bash
npm run build -- --origin=https://chiclove.ec   # o SITE_ORIGIN=... npm run build
```

El build **falla** si tras reescribir queda algún archivo nombrando el dominio
anterior: una sola canónica olvidada mandaría a Google al sitio equivocado.

Cuando la mudanza sea definitiva y no quieras seguir arrastrando la reescritura,
reescribe también las fuentes:

```bash
npm run set-origin https://chiclove.ec -- --dry-run   # qué cambiaría
npm run set-origin https://chiclove.ec                # hacerlo
npm run gen && npm run check                          # regenerar y comprobar
```

Deja `sourceOrigin` y `canonicalOrigin` iguales otra vez. Ojo con dos cosas que
el script ya resuelve: el dominio aparece también **como host suelto** en texto
visible (la ficha de empresa de `/about`, el mensaje del 404), y las URLs de
`github.com` **no** se mudan — el repositorio se llama `chiclove-ec.com`
y seguirá llamándose así.

Después del cambio quedan dos pasos fuera del repositorio: apuntar el DNS y, en
Google Search Console, dar de alta la propiedad nueva y usar **Cambio de
dirección** desde la anterior.

## Despliegue automático

Cada push a `main` dispara los dos destinos. Ambos pasan por CI primero y
**ninguno publica si la suite falla**.

| Destino | Mecanismo | Estado |
|---|---|---|
| GitHub Pages | `deploy-pages.yml` | **En producción.** Publica siempre |
| Cloudflare Pages | Integración Git nativa de Cloudflare | **En producción.** Construye y publica en cada push a `main` |

### Cómo está montado Cloudflare Pages

Cloudflare no despliega por GitHub Actions, sino por su **integración Git nativa**:
la GitHub App *Cloudflare Workers and Pages* está instalada en la organización con
acceso **solo** a este repositorio, y cada push a `main` dispara un build en
Cloudflare.

| Ajuste | Valor |
|---|---|
| Proyecto | `chiclove-ec` (el de `cloudflare.projectName`; `wrangler.toml` debe coincidir) |
| Repositorio | `chiclove-ec/chiclove-ec.com`, rama de producción `main` |
| Framework preset | *None* |
| Comando de build | `npm test && npm run build:cloudflare` |
| Directorio de salida | `dist` |
| Directorio raíz | `/` — ahí vive `functions/`, que Cloudflare compila aparte |
| Node | el de `.nvmrc` |

La suite va **dentro** del comando de build a propósito: si `npm test` falla, el
build falla y Cloudflare no publica. Es el mismo portero que `ci.yml` pone delante
de GitHub Pages.

`deploy-cloudflare.yml` sigue en el repositorio como vía manual de recuperación
(despliegue directo con Wrangler). Las credenciales `CLOUDFLARE_API_TOKEN` y
`CLOUDFLARE_ACCOUNT_ID` están guardadas como secretos para esa vía, pero el workflow
no escucha `push` y no compite con la integración Git nativa.

### Por qué Cloudflare es el destino final

GitHub Pages sirve estáticos y **no deja definir cabeceras HTTP ni ejecutar
código en el borde**. Cloudflare Pages sí, y eso desbloquea dos cosas que el
repositorio ya tiene escritas y probadas:

- **`_headers`** aplica de verdad la CSP, HSTS, `X-Frame-Options`,
  `Permissions-Policy` y el aislamiento entre orígenes. En Pages solo existe la
  CSP por `<meta>` más el guard anti-frame.
- **`functions/_middleware.js`** responde a `Accept: text/markdown` con `Vary`,
  `406` y valores q, como pide acceptmarkdown.com. Vive en `functions/` en la
  raíz del repositorio, **no** dentro de `dist/`: Cloudflare lo compila aparte y
  el build lo mantiene fuera del artefacto público a propósito.

## Otros destinos y comprobación posterior

Además de los dos automáticos, el build tiene objetivo propio para los demás
proveedores; todos publican el mismo `dist/`:

| Proveedor | Cómo | Cabeceras HTTP | Negociación `Accept` |
|---|---|---|---|
| **GitHub Pages** *(en producción)* | *Settings → Pages → Source → GitHub Actions*. La publicación directa desde la rama expone archivos auxiliares y no debe activarse | Solo la CSP por `<meta>` + guard anti-frame | No |
| **Cloudflare Pages** *(destino final)* | `npm run build:cloudflare`, salida `dist` | `_headers`, completas | **Sí**, `functions/_middleware.js` |
| **Netlify** | Importa el repositorio; `netlify.toml` hace el resto | `_headers`, completas | No sin una edge function equivalente |
| **Vercel** | Importa el repositorio; `vercel.json` hace el resto | En `vercel.json`, completas | No: `has.value` usa RE2, sin lookahead para los valores q |

### Comprobar un despliegue

Sustituye el dominio por el que acabes de publicar:

```bash
SITE=https://chiclove-ec.com

# Lo público responde 200
for p in / /tienda.html /about /contact /privacy /llms.txt /agents.md /llms-full.txt /tienda.md; do
  printf "%-16s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$SITE$p")"
done

# Lo privado y lo inexistente responden 404
for p in /README.md /site.config.json /wrangler.toml /package.json /docs/ /ruta-inexistente; do
  printf "%-20s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$SITE$p")"
done

# El dominio declarado es el que toca
curl -s "$SITE/" | grep -o 'rel="canonical" href="[^"]*"'
curl -sI "$SITE/tienda.md" | grep -i content-type      # text/markdown
```

Si `.md` no saliera como `text/markdown`, los agentes siguen leyéndolo igual (el
contenido es texto plano) y `llms.txt` ya avisa de cómo pedirlo.

## Seguridad

- CSP cerrada por defecto (`default-src 'none'`), sin `unsafe-inline` ni `unsafe-eval`,
  con `object-src`/`base-uri`/`form-action`/`frame-ancestors` en `'none'`. Los únicos
  orígenes de terceros permitidos son los de Google Analytics y Clarity, y solo se
  contactan tras el consentimiento. `npm test` comprueba que la misma CSP esté escrita
  en `_headers`, en `vercel.json` y en el `<meta>` de cada página.
- Cabeceras HTTP para CSP, clickjacking, MIME sniffing, referrer, permisos del
  navegador, HTTPS e aislamiento entre orígenes (`_headers` y `vercel.json`).
- Guard visual anti-frame como defensa adicional en hosts sin cabeceras configurables.
- Build de despliegue por lista blanca: documentación, logs, capturas y configuración
  interna no llegan al artefacto público.
- Canal de reporte de vulnerabilidades estándar en `/.well-known/security.txt`.
- El `id` de producto de la URL se valida contra el catálogo (whitelist); nunca
  se inyecta contenido de la URL o del usuario en el DOM.
- Enlaces externos con `rel="noopener noreferrer"`.
- Carrito: los datos de `localStorage` se limitan, revalidan, normalizan y consolidan
  contra el catálogo al cargar.
- El sitio no recoge correos ni pide datos personales en sus formularios; la analítica es opcional
  y solo se carga después del consentimiento. El pedido se entrega directamente a WhatsApp solo
  cuando la persona pulsa el botón de checkout.
- Los precios publicados incluyen IVA y son los vigentes en la tienda. Al no existir backend,
  la persona que atienda WhatsApp confirma disponibilidad, dirección de entrega y datos de la
  transferencia antes de despachar.
