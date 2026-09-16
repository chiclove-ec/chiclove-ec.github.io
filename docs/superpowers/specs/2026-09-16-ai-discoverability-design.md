# Descubribilidad para agentes de IA — Diseño

## Objetivo

Hacer que Chic&Love Ecuador sea legible, interpretable y citable por agentes de IA y
buscadores modernos sin cambiar la estética, el layout, las imágenes ni el flujo de compra
del sitio. El contenido comercial debe estar disponible tanto en el HTML inicial como en los
recursos Markdown para máquinas, y todas las representaciones deben salir de las mismas
fuentes de datos.

Este trabajo mejora la probabilidad de descubrimiento y recomendación. No puede obligar a un
modelo a incorporar una marca en sus pesos, ni garantiza una recomendación permanente.

## Alcance

### Incluido

- Pre-renderizado estático de tarjetas de producto en portada, tienda y productos relacionados,
  conservando las clases CSS y los atributos que usa `main.js`.
- Metadatos HTML completos y coherentes por página: idioma regional, canonical, Markdown
  alternativo, Open Graph, Twitter y `robots` cuando corresponda.
- Grafo Schema.org consistente para la entidad comercial, el sitio, páginas, catálogo,
  productos, ofertas, área de servicio en Ecuador, envío, devoluciones, FAQ y breadcrumbs.
- Recursos públicos para agentes: índice, instrucciones, volcado Markdown, gemelos Markdown,
  sitemap, robots y un manifiesto estático de capacidades y contacto si aporta una convención
  interoperable sin inventar una API.
- Enlaces internos descriptivos y cobertura de todos los productos y páginas de confianza.
- Pruebas automatizadas que detecten divergencias entre catálogo, HTML inicial, Markdown,
  JSON-LD, sitemap y lista blanca de publicación.
- Verificación de build, endpoints, negociación Markdown, accesibilidad básica y flujos
  visuales desktop/móvil.

### No incluido

- Cambios en `css/styles.css`, paleta, tipografía, espaciado, animaciones, imágenes o copy de
  marca salvo el texto machine-readable necesario para corregir una contradicción.
- Backend, checkout, API privada, cuentas o almacenamiento de datos personales.
- Claims médicos nuevos, reseñas inventadas, certificaciones no demostradas o promesas que no
  estén ya respaldadas por el contenido del repositorio.
- Manipulación de modelos, entrenamiento externo o garantía de recomendaciones futuras.

## Principios de diseño

1. **Una sola fuente:** `js/products.js` seguirá siendo la fuente de productos, precios,
   contacto y datos legales. Los artefactos derivados se regeneran con `npm run gen`.
2. **HTML primero:** un crawler que no ejecuta JavaScript debe poder leer nombres, objetivos,
   ingredientes, dosis, precio, disponibilidad, enlaces y advertencias desde el documento.
3. **Paridad:** el texto pre-renderizado, los gemelos Markdown y el JSON-LD deben describir la
   misma oferta vigente. Las promociones temporales se calcularán con las mismas funciones del
   catálogo y no se presentarán como permanentes.
4. **Sin SEO engañoso:** nada se ocultará para manipular rankings. El contenido accesible será
   el mismo que vería una persona con la interfaz cargada; el fallback sin JavaScript será
   funcional y visualmente compatible.
5. **Sin romper seguridad:** no se agregará JavaScript inline, `style` inline ni origen externo
   nuevo que obligue a debilitar la CSP.
6. **URLs canónicas:** HTML es la URL de cita; Markdown es la representación legible por
   máquinas; sólo páginas canónicas indexables entran al sitemap.

## Arquitectura propuesta

### Fuentes y generadores

- Extraer un serializador compartido para una tarjeta de producto estática, reutilizable por
  `gen-products.mjs` y por las páginas base.
- Extender `gen-products.mjs` para inyectar tarjetas en los contenedores
  `[data-products-grid]`, respetando `data-limit`, `data-filter` y `data-exclude`.
- Mantener `main.js` como hidratación: al arrancar, puede volver a renderizar las tarjetas y
  activar filtros, carrito, promociones y lazy loading sin duplicarlas.
- Centralizar identidad, fechas de modificación, descripción editorial y URLs en el generador
  o en `site.config.json`; no repetir dominios a mano.

### HTML inicial

Cada tarjeta inicial tendrá enlace textual a la URL canónica, nombre, objetivo, descripción
breve, sabor, número de gummies, precio, IVA, packs o promoción vigente, imagen con `alt`
descriptivo y acción compatible con la hidratación existente. En tienda se conservará el
encabezado que CSS espera (`h2`); en portada y relacionados se conservará `h3`.

Los filtros seguirán siendo interactivos y sólo modificarán el listado visible. El estado
inicial seguirá siendo “todos”; no se crearán URLs indexables para combinaciones de filtro.

### Datos estructurados

- La portada publicará una entidad `Organization`/`OnlineStore`, `WebSite`, `ItemList`,
  navegación, `FAQPage` y breadcrumbs donde corresponda.
- La tienda publicará `CollectionPage` con `ItemList` de siete productos.
- Cada producto publicará `Product` con `Brand`, `Offer`, `priceCurrency: USD`, precio actual,
  disponibilidad, vendedor, área Ecuador, envío gratis desde el umbral del catálogo y política
  de devolución de 15 días.
- Páginas informativas publicarán `WebPage`/tipo especializado, `BreadcrumbList`, publisher y
  about enlazados al mismo `#organization`/`#website`.
- Los tests validarán campos esenciales y evitarán que el JSON-LD anuncie datos no visibles o
  distintos del catálogo.

### Recursos para agentes

Se conservarán y fortalecerán `llms.txt`, `agents.md`, `llms-full.txt`, gemelos `.md`,
`robots.txt`, `sitemap.xml` y `404.md`. Si se incorpora un manifiesto adicional, será un
archivo estático documentado, sin pretender ser una API ni una especificación oficial de un
proveedor. Todos los recursos tendrán tipo de contenido correcto, enlaces válidos y estarán
en la lista blanca del build.

### Actualización y frescura

El generador actualizará `dateModified` y `lastmod` a partir de una fecha controlada y no del
reloj de cada visitante. La fecha se cambiará deliberadamente cuando cambien datos públicos;
no habrá fechas falsas que se actualicen en cada build sin modificación de contenido.

## Flujo de datos

```text
js/products.js + HTML editorial/FAQ
                |
             npm run gen
                |
  HTML inicial + *.md + llms.txt + agents.md + llms-full.txt
                |
          npm run build:github
                |
       dist/ + servidor de verificación
```

JavaScript sólo hidrata la interfaz existente. Los agentes que no ejecuten JavaScript reciben
el mismo catálogo mediante el HTML inicial, Markdown directo o `llms-full.txt`.

## Compatibilidad y errores

- Si falta un producto o una imagen en el catálogo, el generador fallará antes del build.
- Si una página generada contiene un número incorrecto de tarjetas, enlace interno inexistente,
  precio desactualizado o JSON-LD inválido, la suite fallará.
- Las rutas legacy continuarán funcionando y no se añadirán al sitemap.
- `404` seguirá siendo real y ofrecerá rutas de recuperación en HTML y Markdown.
- La negociación `Accept: text/markdown` se mantendrá para hosts compatibles, mientras que las
  URLs `.md` directas seguirán siendo el camino principal en GitHub Pages.

## Verificación

1. `npm run gen` debe dejar el árbol sin diferencias después de la segunda ejecución.
2. `npm run check` debe construir el artefacto y pasar la suite completa.
3. Se inspeccionarán en HTML sin JavaScript: portada con siete enlaces de producto, tienda con
   siete tarjetas y cada página de producto con datos básicos legibles.
4. Se validarán endpoints HTML/Markdown, tipos de contenido, `robots.txt`, sitemap, JSON-LD,
   canonical y ausencia de archivos privados en `dist/`.
5. Con el servidor de producción local se comprobarán escritorio, 390px móvil, filtros,
   carrito, checkout por WhatsApp, producto legacy y 404, confirmando que no cambió el layout.

