# Chic&Love Ecuador — Sitio web

Sitio estático (HTML/CSS/JS vanilla, con build de despliegue sin dependencias) para la marca de gomitas de vitaminas
**Chic&Love Ecuador**. Diseño minimalista/futurista inspirado en lusetabeauty.com.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Landing: hero, bestsellers, beneficios, ritual, testimonios y FAQ |
| `tienda.html` | Catálogo completo con filtros por objetivo |
| `producto.html?id=<slug>` | Detalle de producto (renderizado por JS desde el catálogo) |
| `nosotros.html` | Historia y filosofía de la marca |
| `about.html` · `contact.html` · `privacy.html` | Páginas de confianza: identidad de la empresa, atención al cliente y privacidad (`/about`, `/contact`, `/privacy`) |
| `llms.txt` | Índice del sitio para agentes, con cuándo usarlo (formato llmstxt.org) |
| `agents.md` | Instrucciones para agentes: identidad, límites y cómo leer el sitio (generado) |
| `llms-full.txt` | Todo el markdown del sitio en un archivo (generado) |
| `*.md` | Gemelo markdown de cada página, incluido `404.md` |
| `js/products.js` | **Catálogo: nombres, precios, textos, colores — edita aquí** |
| `js/main.js` | Navegación, carrito (localStorage) y checkout por WhatsApp |
| `js/product-page.js` | Render de la página de producto |
| `js/analytics.js` | Consentimiento y eventos de analítica (GA4/Clarity, al completar sus IDs) |
| `css/styles.css` | Todos los estilos |
| `assets/img/` | Imágenes optimizadas de producto con fondo transparente |
| `functions/_middleware.js` | Negociación `Accept: text/markdown` (solo Cloudflare Pages) |
| `scripts/gen-products.mjs` · `scripts/gen-jsonld.mjs` | Generadores desde el catálogo y el FAQ visible (`npm run gen`) |
| `scripts/lib/` | Lógica compartida: catálogo, negociación de contenido y servidor estático |
| `tests/` | Suite de `node:test` (`npm test`) |

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

## Contenido para agentes

- **`/llms.txt`** — índice en formato [llmstxt.org](https://llmstxt.org): resumen, cómo llamar
  al sitio, cuándo usarlo (y cuándo no) y enlaces a todo el contenido en markdown.
- **`/agents.md`** — archivo de instrucciones autocontenido para agentes que buscan uno:
  identidad, casos de uso, límites explícitos y cómo leer el sitio.
- **`/llms-full.txt`** — todo el markdown del sitio en un solo archivo, con la URL de origen
  de cada sección, para cargarlo de una sola vez.
- **Gemelos markdown** — cada página HTML tiene su `.md` en la misma ruta
  (`/tienda.html` → `/tienda.md`, `/about` → `/about.md`), declarado con
  `<link rel="alternate" type="text/markdown">`.
- **`robots.txt`** — rastreo permitido explícitamente para GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended, Applebot y compañía, y punteros a `llms.txt` y `agents.md`.
- **404 recuperable** — `404.html` responde 404 real con enlaces a `/llms.txt`, `/sitemap.xml`
  y las secciones principales; `404.md` es su versión markdown.
- **Datos estructurados** — `FAQPage` en la portada, `CollectionPage`+`ItemList` en la tienda,
  `Product` con `Offer`, `shippingDetails` y `hasMerchantReturnPolicy` por producto,
  `AboutPage`/`ContactPage` en las páginas de confianza. Van estáticos en el HTML (la CSP
  impide inyectarlos por JS) y `npm test` falla si dejan de coincidir con el catálogo o con el
  texto visible de la página.
- **Política de devoluciones** — no se aceptan devoluciones ni cambios por decisión del cliente
  (producto alimenticio); los pedidos dañados, incompletos o equivocados se resuelven por
  WhatsApp. Está en `/contact#devoluciones`, en el FAQ de la portada, en `/about`, en los
  markdown y como `MerchantReturnNotPermitted` en cada oferta.

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

`functions/_middleware.js` y `scripts/lib/markdown-negotiation.mjs` están escritos y probados
para el día que haga falta: sirven para Cloudflare Pages, y también si se mantiene GitHub
Pages como origen detrás de un dominio propio proxeado por Cloudflare. Hoy no se despliegan.

## Cómo funciona la compra

No hay backend: el carrito vive en `localStorage` y "Finalizar pedido" abre
WhatsApp con el pedido ya redactado (productos, cantidades y total).
Para cambiar el número, edita `CL_WHATSAPP` en `js/products.js`.

## Analítica y reportes

`js/analytics.js` está incluido en todas las páginas. Google Analytics 4 ya está configurado y la
web pide consentimiento antes de cargarlo. Registra visitas, productos vistos, filtros, clics de
contacto, carrito, inicio de checkout y preguntas frecuentes, sin enviar nombres, teléfonos,
mensajes ni el contenido del carrito. El archivo `googlee70d0e2c8fe95f2c.html` mantiene la
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
contraseña de aplicación; para un correo corporativo se pueden usar sus datos SMTP.

El workflow también puede lanzarse manualmente desde **Actions → Weekly analytics report → Run
workflow** para probar la configuración sin esperar al lunes. Nunca pongas estas credenciales en
HTML, JavaScript, el repositorio ni `js/analytics.js`.

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

## Deploy

- **Vercel:** importa el repositorio. `vercel.json` ejecuta el build seguro, publica
  `dist/` y configura las cabeceras HTTP.
- **Netlify:** importa el repositorio. `netlify.toml` ejecuta el build, publica `dist/`
  y el `_headers` copiado al artefacto aplica las cabeceras.
- **Cloudflare Pages:** usa `npm run build:cloudflare` como comando y `dist` como
  directorio de salida. `functions/` se queda en la raíz del repositorio (no en `dist/`):
  Cloudflare lo compila aparte y ahí vive la negociación `Accept: text/markdown`.
- **GitHub Pages:** en *Settings → Pages → Build and deployment → Source* selecciona
  **GitHub Actions**. El workflow `.github/workflows/deploy-pages.yml` publica solo
  el artefacto permitido. La publicación directa desde la rama expone archivos
  auxiliares y no debe mantenerse activa.

GitHub Pages no permite definir todas las cabeceras HTTP. El sitio incluye un guard
anti-frame para mitigar clickjacking allí, pero Vercel, Netlify o Cloudflare Pages son
preferibles para producción porque sí aplican CSP `frame-ancestors`, `nosniff`,
Permissions-Policy y aislamiento entre orígenes.

Después de desplegar, comprueba que `/README.md`, `/vercel.json`, `/_headers`,
`/docs/` y `/output/` respondan 404, que `/ruta-inexistente` responda 404 con enlaces de
recuperación, que `/about`, `/contact`, `/privacy`, `/llms.txt`, `/agents.md`,
`/llms-full.txt` y `/tienda.md` respondan 200 y que la portada entregue las cabeceras
previstas:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://chiclove-ec.github.io/ruta-inexistente  # 404
curl -sI https://chiclove-ec.github.io/tienda.md | grep -i content-type                  # text/markdown
```

Si `.md` no saliera como `text/markdown`, los agentes siguen leyéndolo igual (el contenido es
texto plano) y `llms.txt` ya avisa de cómo pedirlo.

## Seguridad

- CSP cerrada por defecto, sin scripts/estilos inline, sin conexiones de terceros y
  con Trusted Types para bloquear sinks de DOM XSS.
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
- Los precios y el total enviados por el navegador son referenciales: al no existir
  backend, la persona que atienda WhatsApp debe confirmar catálogo, precio y
  disponibilidad antes de cobrar o despachar.
