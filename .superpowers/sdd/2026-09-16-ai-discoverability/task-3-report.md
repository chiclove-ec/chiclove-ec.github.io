# Task 3 — Normalizar metadatos regionales y grafo Schema.org

## Alcance entregado

- Se declaró `contentModified: "2026-09-16"` en `site.config.json` y el cargador lo valida como fecha ISO de calendario real.
- Se normalizó `lang="es-EC"`, autor, robots, Open Graph, canónica, Twitter y gemelo Markdown de las páginas indexables. `404.html` y la plantilla heredada `producto.html` permanecen con `noindex`; las fichas generadas sí reciben las directivas indexables.
- La fecha configurada alimenta `dateModified` en las entidades editoriales y fichas, y todos los `lastmod` del sitemap regenerado.
- El grafo de portada conecta Organization, WebSite, WebPage, FAQPage, colección, productos y breadcrumbs con `#organization` y `#website`. La organización publica identidad legal, ubicación, cobertura, contacto, catálogo y conocimientos derivados únicamente de objetivos y activos ya existentes.
- No se añadió `aggregateRating` ni se usó el campo de reseñas. No se cambiaron títulos, descripciones, imágenes, CSS, CSP ni contenido visible.

## TDD y comandos ejecutados

1. Prueba roja inicial:

   ```text
   node --test --test-concurrency=1 tests/structured-data.test.mjs tests/deployment-consistency.test.mjs
   SyntaxError: ... site-config.mjs does not provide an export named 'assertContentModified'
   ```

   Además, los contratos nuevos detectaron ausencia de `hasOfferCatalog`, enlaces de entidad y fecha centralizada.

2. Regeneración y prueba focalizada verde:

   ```text
   npm run gen && node --test --test-concurrency=1 tests/structured-data.test.mjs tests/deployment-consistency.test.mjs
   # tests 24
   # pass 24
   # fail 0
   ```

3. Verificación de artefacto:

   ```text
   npm run build:github
   Build seguro para github-pages en https://chiclove-ec.com: .../dist

   git diff --check
   # sin salida; no hay errores de espacios
   ```

4. Suite completa:

   ```text
   npm test
   # tests 99
   # pass 97
   # fail 2
   ```

## Preocupaciones

La suite completa falla únicamente en los dos contratos de `ai.txt` (`tests/ai-discoverability.test.mjs` y `tests/site-artifacts.test.mjs`). Ese archivo pertenece explícitamente a Task 4 y no se creó ni se añadió a la lista blanca en Task 3. Los contratos focalizados de esta tarea pasan 24/24 y la construcción de GitHub Pages pasa.
