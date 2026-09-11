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
```

## Reglas que no se pueden romper

1. **`js/products.js` es la única fuente de verdad comercial.** Precios, nombres,
   colores, promociones, WhatsApp y datos legales solo se editan ahí.
2. **Lo derivado no se edita a mano.** Las páginas `<slug>.html`, sus `.md`,
   `index.md`, `tienda.md`, `agents.md`, `llms-full.txt` y los JSON-LD de portada
   y tienda salen de `npm run gen`. Tras tocar el catálogo o el FAQ visible de la
   portada, regenera y sube el resultado: CI falla si hay diferencias.
3. **Sin `style=` ni `<script>` inline.** La CSP no lleva `unsafe-inline`. Usa las
   clases utilitarias de `css/styles.css` (`.pt-0`, `.center-cta`, `.av-*`).
4. **La CSP está escrita tres veces** — `_headers`, `vercel.json` y el `<meta>` de
   cada página — y una prueba exige que sean idénticas. Cámbialas juntas.
5. **Cache-busting manual.** Si tocas `css/styles.css` o un `js/*.js`, sube el
   token `?v=AAAAMMDD-N` en **todas** las páginas a la vez.
6. **Lista blanca del build.** Un archivo nuevo que deba publicarse va en
   `scripts/build.mjs`, o no llegará a producción.
7. **`googlee70d0e2c8fe95f2c.html` no se borra** ni sale del build: es la
   verificación de Google Search Console.
8. **Nada de emojis dentro de URLs de `wa.me`**: WhatsApp los convierte en `U+FFFD`.
9. **Nunca** escribas credenciales en el repositorio; los secretos del informe
   semanal viven en los *Actions secrets* de GitHub.

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

## Verificación end-to-end

La skill `verify` (`.claude/skills/verify/SKILL.md`) tiene la receta con
Playwright y los flujos que importan.
