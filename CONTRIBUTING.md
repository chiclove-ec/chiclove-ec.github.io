# Cómo trabajar en este repositorio

Sitio estático sin dependencias. Basta con **Node 20 o superior** (la versión que
usa CI está en [`.nvmrc`](.nvmrc)). No ejecutes `npm install`: no hay paquetes.

```bash
npm run gen     # regenera todo lo derivado del catálogo
npm run check   # construye dist/ y ejecuta la suite completa
npm run serve   # sirve dist/ en http://localhost:8765 igual que producción
```

## La regla que gobierna el repositorio

**`js/products.js` es la única fuente de verdad comercial.** Precios, nombres,
colores, promociones, el número de WhatsApp y los datos legales viven ahí y en
ningún otro sitio.

A partir de ese archivo se **generan**, y no se editan a mano:

- las páginas de producto `<slug>.html` y sus gemelos `<slug>.md`,
- `index.md`, `tienda.md`, `agents.md` y `llms-full.txt`,
- el `FAQPage`, los `ItemList` y el `CollectionPage` de portada y tienda.

Si editas el catálogo o el FAQ visible de la portada, ejecuta `npm run gen` y
**sube también lo regenerado**. CI falla si quedan diferencias.

## Antes de abrir un pull request

1. `npm run gen` — no debe dejar diferencias que no hayas incluido.
2. `npm run check` — build y suite en verde.
3. Si tocaste `css/styles.css` o cualquier `js/*.js`, **sube el token de
   cache-busting** `?v=AAAAMMDD-N` en todas las páginas a la vez. Hay una prueba
   que falla si una página se queda con un token distinto.
4. Si añadiste un archivo que el público debe poder descargar (una imagen, una
   página), añádelo a la lista blanca de `scripts/build.mjs`. Hay una prueba que
   falla si una página referencia algo que el build no copia.

## El dominio

El dominio del sitio **no se escribe a mano**. Vive en `site.config.json` y el
código lo lee con `loadSiteConfig()`; hay una prueba que falla si vuelve a
aparecer incrustado en `scripts/`, `tests/` o `functions/`.

En el **contenido** (canónicas, JSON-LD, markdown) sí está escrito literalmente:
eso es `sourceOrigin`, y el build lo sustituye por `canonicalOrigin` al copiar a
`dist/`. Para mudar el sitio de dominio basta con cambiar `canonicalOrigin`.

Detalles que hay que tener presentes y que las pruebas ya vigilan:

- El dominio aparece también **como host suelto** en texto visible (la ficha de
  empresa de `/about`, el mensaje del 404), no solo como `https://…`.
- Las URLs de **`github.com` no se mudan**: el repositorio se llama
  `chiclove-ec.com` y seguirá llamándose así aunque el sitio cambie de
  dominio. `rewriteOrigin` las aparta a propósito.

El procedimiento completo está en la sección *El dominio del sitio* del README.

## Despliegue automático

Cada push a `main` publica en GitHub Pages y, en cuanto se configure, también en
Cloudflare Pages. Los dos workflows llaman antes a `ci.yml` y **no publican si la
suite falla**. `deploy-cloudflare.yml` se salta solo mientras no existan sus
secretos, así que hoy no ensucia el historial.

Si añades un archivo de configuración de hosting, recuerda mantenerlo fuera del
artefacto: va a la lista `forbidden` de `scripts/build.mjs` y a `.vercelignore`.

## Convenciones

- **Sin dependencias.** Ni de runtime ni de build ni de test. Si algo necesita
  una librería, casi siempre se puede resolver con la librería estándar.
- **Sin estilos ni scripts inline.** La CSP no lleva `unsafe-inline`. Para
  variaciones puntuales hay clases utilitarias en `css/styles.css`.
- **La CSP se escribe tres veces** (`_headers`, `vercel.json` y el `<meta>` de
  cada página) y deben ser idénticas. Cámbialas juntas.
- **Comentarios y textos en español**, igual que el resto del repositorio.
- **Nada de emojis dentro de URLs de `wa.me`**: el redirect de WhatsApp los
  convierte en `U+FFFD`.
- **Nunca** pongas credenciales en HTML, JavaScript ni en el repositorio. Los
  secretos del informe semanal viven en *Settings → Secrets and variables →
  Actions* (ver README).

## Promociones

`CL_PROMOS` en `js/products.js` abre y cierra la promoción sola en las fechas
indicadas. La excepción son los datos estructurados de las fichas, que son
estáticos: cuando la promo cierre, vuelve a ejecutar `npm run gen` y despliega
para que el precio que ve Google regrese al de catálogo. El generador avisa por
consola mientras haya un precio promocional escrito en el JSON-LD.

## Seguridad

Los fallos explotables no se reportan en un issue público: sigue
[`SECURITY.md`](SECURITY.md).
