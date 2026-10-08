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
- **Uniformidad estética y tokens de diseño.** Todo cambio debe ajustarse a la estética
  editorial, cálida y dopaminérgica del sitio. Usa exclusivamente los tokens de `css/styles.css`
  (`--paper`, `--card`, `--ink`, `--muted`, `--line`, `--r-*`, `--shadow-*` y la paleta por fórmula).
  Nunca uses fuentes remotas (la CSP bloquea orígenes externos).
- **Mobile-first y cero desbordamiento horizontal.** El sitio se verifica en 320px y 390px;
  `document.documentElement.scrollWidth - document.documentElement.clientWidth` debe ser estrictamente 0.
- **Nada de emojis dentro de URLs de `wa.me`**: el redirect de WhatsApp los
  convierte en `U+FFFD`.
- **Nunca** pongas credenciales en HTML, JavaScript ni en el repositorio. Los
  secretos del informe semanal viven en *Settings → Secrets and variables →
  Actions* (ver README).

## Estándares de diseño y desarrollo

La guía canónica completa para mantener la uniformidad visual, componentes y arquitectura está en
[`docs/estandares-de-diseno-y-desarrollo.md`](docs/estandares-de-diseno-y-desarrollo.md).

Puntos esenciales para agentes y colaboradores:
1. **Paleta y tokens:** Fondo `--paper` (#f7f4ef), superficies `--card` (#fffdfb), tinta `--ink` (#111112),
   y los colores propios de las 7 fórmulas (Lavanda, Rosa, Verde, Celeste, Magenta, Teal, Azul rey).
2. **Tipografía del sistema:** `ui-rounded`/`system-ui` con escalado fluido `clamp()`. Sin Google Fonts.
3. **Componentes:** Botones en píldora (`999px`) con micro-interacciones hover/active, tarjetas `.pcard` con
   radio `--r-md` (20px), contenedor universal `.wrap` (máximo 1180px), y animaciones suaves con `.reveal`.
4. **Verificación técnica obligatoria:** Antes de abrir un PR:
   - `npm run gen`
   - `npm run check` (build + 100% pruebas de node:test en verde)
   - Actualización del token `?v=AAAAMMDD-N` si se tocaron estilos o scripts.


## Promociones

`CL_PROMOS` en `js/products.js` abre y cierra la promoción sola en las fechas
indicadas. La especificación técnica completa y el procedimiento operativo mes a
mes están detallados en [`docs/promociones-mensuales.md`](docs/promociones-mensuales.md).

Puntos clave de cada campaña mensual:
- **Paneles en inicio y tienda:** Portada (`index.html`) y catálogo (`tienda.html`)
  incluyen un panel de promoción (`data-promo-band`) con estética compacta, kicker
  («Solo en <mes>»), badge de descuento («−XX%»), precios, CTA y fotografía
  editorial. Las fórmulas que comparten descuento se agrupan en una sola banda
  mediante `group` y `CL_PROMO_GROUPS`.
- **Etiquetas en secciones de productos con descuento:** En las tarjetas (`.pcard`
  en inicio, tienda y relacionados), los productos rebajados muestran el borde
  acentuado (`.is-promo`), la etiqueta superior de porcentaje (`.pcard-promo-tag`),
  el precio de lista tachado (`del`), la línea secundaria (`−XX% en <mes>`) y la
  píldora de ahorro (`.pcard-saving`). En su ficha, se activa `#pd-promo` y la
  variante individual con su badge de ahorro.
- **Regla de packs (`singleOnly`):** Si comprar 2 o 3 frascos sueltos a precio de
  promo cuesta lo mismo o menos que el pack, es obligatorio activar `singleOnly: true`
  (retira los packs mientras dure la promo y cambia el selector a «Tu presentación»).
- **Actualización automática:** Lo generado (JSON-LD, markdown, `catalog.json`,
  franja superior del HTML) lo pone al día `refresh-catalog.yml` a las 00:07 de
  Ecuador del día en que una promo abre o cierra. Si ves un issue «La actualización
  automática del catálogo no se completó», abre el PR de la rama que indica o ejecuta
  `npm run refresh` y súbelo. Para ver hoy cómo quedará el sitio en otra fecha:
  `npm run refresh -- --now=<fecha ISO>` (y descarta el resultado).


## Seguridad

Los fallos explotables no se reportan en un issue público: sigue
[`SECURITY.md`](SECURITY.md).
