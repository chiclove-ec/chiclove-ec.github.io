# Chic&Love Ecuador — Diseño del sitio web

**Fecha:** 2026-07-19 · **Modo:** autónomo (goal activo, sin usuario disponible para aprobaciones)

> **Documento histórico.** Es el diseño original con el que se construyó el sitio el
> 2026-07-19; se conserva porque explica *por qué* el sitio es como es (tipografías,
> paleta por producto, alternativas descartadas). **No es la referencia actual**: varias
> decisiones han cambiado desde entonces.
>
> Para el estado real del sitio, mira el [README](../README.md). Diferencias conocidas
> frente a este documento:
>
> - El WhatsApp de venta es **593987591741** (aquí aparece uno anterior).
> - Los precios vigentes están en `js/products.js`, no en este documento.
> - Cada producto tiene ya su **página estática canónica** `/<slug>.html`;
>   `producto.html?id=` quedó como URL heredada y como plantilla del generador.
> - Hay **build** (`scripts/build.mjs`, lista blanca hacia `dist/`), suite de pruebas y CI.
> - No se usan Google Fonts: la CSP cerró los orígenes externos y la tipografía es una
>   pila del sistema (`ui-rounded`/`system-ui`) definida en `css/styles.css`.

## Objetivo

Sitio web completo, minimalista y futurista para Chic&Love Ecuador (gomitas de vitaminas),
inspirado en la estructura de lusetabeauty.com, con estética "dopaminérgica y limpia" que
impulse la compra inmediata. Sin backend: checkout vía WhatsApp (canal real de venta de la
marca: 0984012787, IG @chicloveec).

## Marca (del catálogo PDF)

7 productos, cada uno con color propio (60 gummies c/u):

| Producto | Color | Claims clave | Sabor |
|---|---|---|---|
| Hair & Nails Forte | Lavanda #A78BDB | Anticaída, crecimiento, biotina+B12+ashwagandha | Frutos rojos |
| Radiant Skin Vitamins | Rosa #F2A2AE | Colágeno, Q10, biotina, luminosidad | Frutos rojos |
| Vinagre de Manzana ACV | Verde #35B34A | Digestión, glucosa estable, control de peso, jengibre | Manzana |
| Sleep Vitamins | Celeste #4FA8D8 | Melatonina + B6, sueño reparador | Fresa |
| Sexual Booster Women | Magenta #B3538F | Maca + damiana, libido, energía | Cereza |
| Sexual Booster Men | Azul/teal #2E7FC2 | Maca + fenogreco, rendimiento, fertilidad | Cereza |
| Anti-Stress Gummies | Azul rey #2B4FC7 | Ashwagandha + melisa + ginseng, cortisol | Naranja |

## Arquitectura (estática, vanilla HTML/CSS/JS, sin build)

- `index.html` — landing completa: announcement bar, nav glass sticky, hero, marquee,
  badges de confianza, grid de productos, sección beneficios/ritual, testimonios, FAQ,
  CTA newsletter/WhatsApp, footer.
- `tienda.html` — catálogo con filtros por objetivo (chips).
- `producto.html?id=slug` — detalle renderizado por JS desde `js/products.js`
  (id validado contra whitelist del catálogo; sin HTML inyectado desde la URL).
- `nosotros.html` — historia de marca (foto lifestyle del catálogo).
- `css/styles.css`, `js/products.js` (datos), `js/main.js` (nav, carrito, reveals),
  `js/product-page.js`, `assets/img/*` (webp + logos png).

## Decisiones de diseño

- **Tipografía:** Space Grotesk (display, futurista) + Inter (cuerpo), Google Fonts.
- **Base:** blanco/hueso #FAF8F5, tinta #131313; acentos = color de cada producto
  (CSS custom properties por tarjeta/página → theming automático).
- **Dopamina:** gradientes suaves por producto, blobs difusos animados en hero, marquee,
  micro-interacciones hover (lift + tilt de botella), reveal on scroll (IntersectionObserver),
  contador de stock/envío, precios con ancla ("2x -15%").
- **Carrito:** drawer lateral, estado en localStorage, checkout genera mensaje de pedido a
  `wa.me/593984012787` con `encodeURIComponent`.
- **Precios:** USD (Ecuador), $27.90 por frasco, pack x2 $47.90 — editables en `products.js`.

## Seguridad / calidad

- CSP por meta tag (self + Google Fonts + wa.me), `rel="noopener noreferrer"` en externos.
- Nada de `innerHTML` con datos de usuario; el id de producto se valida contra el catálogo.
- Formularios con validación; sin eval; sin dependencias externas de JS.
- Disclaimer legal: "Complemento alimenticio. No sustituye una dieta equilibrada."
- Accesibilidad: contraste AA, focus visible, alt en imágenes, aria en drawer/menú,
  `prefers-reduced-motion` respetado.

## Alternativas consideradas

1. **React/Vite SPA** — descartado: sin necesidad de estado complejo, agrega build y peso.
2. **Shopify/liquid clone** — descartado: no hay backend ni cuenta; WhatsApp es el canal real.
3. **Estático vanilla multipágina (elegida)** — abre con doble clic, deploy trivial
   (Netlify/GitHub Pages), rendimiento máximo, control total del diseño.
