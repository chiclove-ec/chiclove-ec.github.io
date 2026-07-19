# Chic&Love Ecuador — Sitio web

Sitio estático (HTML/CSS/JS vanilla, sin build) para la marca de gomitas de vitaminas
**Chic&Love Ecuador**. Diseño minimalista/futurista inspirado en lusetabeauty.com.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Landing: hero, bestsellers, beneficios, ritual, testimonios, FAQ, newsletter |
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

## Deploy

La versión pública está desplegada con GitHub Pages en
[chiclove-ec.github.io](https://chiclove-ec.github.io/). El sitio se publica desde la
rama `main` del repositorio `chiclove-ec/chiclove-ec.github.io`.

GitHub Pages no aplica las cabeceras de `_headers` ni `vercel.json`; la CSP incluida
en cada documento HTML permanece activa. Para añadir HSTS, `frame-ancestors` y otras
cabeceras HTTP, se puede desplegar el mismo repositorio en Netlify o Vercel.

## Seguridad

- CSP cerrada por defecto, sin scripts/estilos inline, sin conexiones de terceros y
  con Trusted Types para bloquear sinks de DOM XSS.
- Cabeceras HTTP para CSP, clickjacking, MIME sniffing, referrer, permisos del
  navegador, HTTPS e aislamiento entre orígenes (`_headers` y `vercel.json`).
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
