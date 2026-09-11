---
name: verify
description: Cómo lanzar y verificar el sitio Chic&Love end-to-end
---

# Verificar el sitio Chic&Love

Sitio estático con build por lista blanca. Superficie: navegador.

## Comprobación rápida (sin navegador)

```bash
npm run gen     # no debe dejar diferencias en git
npm run check   # build:github + 73 pruebas de node:test
```

Cubre CSP idéntica en las tres copias, referencias internas, lista blanca del
build, cache-busting, datos estructurados contra el catálogo, gemelos markdown,
negociación de contenido, sitemap y `security.txt`.

## Lanzar el sitio como producción

```bash
cd "/Users/danilomonge/Desktop/Own Projects/Chic&Love Website"
npm run build && npm run serve    # http://localhost:8765
```

`scripts/serve.mjs` sirve `dist/` reproduciendo producción: rutas sin extensión
(`/about` → `about.html`), 404 real y negociación `Accept: text/markdown`.
`python3 -m http.server 8765` sobre la raíz también sirve para mirar el árbol de
trabajo, pero ahí las rutas sin extensión y el 404 **no** se comportan igual.

## Manejar (Playwright + Chrome instalado)

`playwright-core` (npm) con `chromium.launch({ channel: "chrome", headless: true })`.
No requiere descargar navegadores.

Flujos que importan:
- index: 4 tarjetas bestsellers; "Añadir +" abre el drawer del carrito y sube el badge.
- Checkout: clic en `#cart-checkout` abre popup `wa.me`/`api.whatsapp.com` con el pedido.
- tienda: 7 tarjetas; chips filtran (Sueño→1, Energía→2).
- `/anti-stress.html` (URL canónica): variantes cambian precio; relacionados
  excluyen el producto; el JSON-LD `Product` trae oferta e InStock.
- `producto.html?id=anti-stress` (heredada): sigue funcionando y canonicaliza a
  `/anti-stress.html`.
- `producto.html?id=<inválido>` → fallback al primer producto (sin crash).
- Móvil 390px: burger abre menú; `scrollWidth - clientWidth` debe ser 0.

## Gotchas

- Los `.reveal` son invisibles hasta hacer scroll (IntersectionObserver). Para
  screenshots full-page: primero `document.documentElement.style.scrollBehavior = "auto"`
  y scrollear en pasos hasta el fondo, luego capturar.
- La CSP por meta no admite `frame-ancestors` (ruido de consola si se agrega);
  en GitHub Pages lo cubre `js/frame-guard.js`.
- No usar estilos inline en HTML: la CSP no lleva `unsafe-inline` en style-src.
- La analítica no carga hasta que se acepta el consentimiento: para probar los
  eventos hay que aceptar el banner primero.
