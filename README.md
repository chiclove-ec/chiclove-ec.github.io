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
| `js/products.js` | **Catálogo: nombres, precios, textos, colores — edita aquí** |
| `js/main.js` | Navegación, carrito (localStorage) y checkout por WhatsApp |
| `js/product-page.js` | Render de la página de producto |
| `css/styles.css` | Todos los estilos |
| `assets/img/` | Imágenes optimizadas de producto con fondo transparente |

## Cómo verlo

```bash
cd "Chic&Love Website"
python3 -m http.server 8765
# abrir http://localhost:8765
```

(También funciona abriendo `index.html` con doble clic, pero con servidor la CSP
se comporta igual que en producción.)

## Cómo funciona la compra

No hay backend: el carrito vive en `localStorage` y "Finalizar pedido" abre
WhatsApp (**0984012787**) con el pedido ya redactado (productos, cantidades y total).
Para cambiar el número, edita `CL_WHATSAPP` en `js/products.js`.

## Editar precios / productos

Todo el catálogo está en `js/products.js` (`CL_PRODUCTS`): precio por frasco
(`price`), precio del pack x2 (`pricePack`), beneficios, activos, colores, etc.
Los cambios se reflejan automáticamente en tienda, tarjetas, detalle y carrito.

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
  directorio de salida.
- **GitHub Pages:** en *Settings → Pages → Build and deployment → Source* selecciona
  **GitHub Actions**. El workflow `.github/workflows/deploy-pages.yml` publica solo
  el artefacto permitido. La publicación directa desde la rama expone archivos
  auxiliares y no debe mantenerse activa.

GitHub Pages no permite definir todas las cabeceras HTTP. El sitio incluye un guard
anti-frame para mitigar clickjacking allí, pero Vercel, Netlify o Cloudflare Pages son
preferibles para producción porque sí aplican CSP `frame-ancestors`, `nosniff`,
Permissions-Policy y aislamiento entre orígenes.

Después de desplegar, comprueba que `/README.md`, `/vercel.json`, `/_headers`,
`/docs/` y `/output/` respondan 404 y que la portada entregue las cabeceras previstas.

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
- El sitio no recoge correos, cookies ni analítica; el pedido se entrega directamente
  a WhatsApp solo cuando la persona pulsa el botón de checkout.
- Los precios y el total enviados por el navegador son referenciales: al no existir
  backend, la persona que atienda WhatsApp debe confirmar catálogo, precio y
  disponibilidad antes de cobrar o despachar.
