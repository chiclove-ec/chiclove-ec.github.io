# Diseño: navegación fluida sin cambios visuales

## Objetivo

Reducir el trabajo de renderizado y la latencia percibida al navegar por Chic&Love Ecuador, manteniendo exactamente la apariencia, las animaciones y los flujos de compra actuales.

## Evidencia del diagnóstico

- Las páginas publican tarjetas de producto completas en HTML para que funcionen antes de JavaScript.
- `js/main.js` vacía y reconstruye todos los grids en cada `DOMContentLoaded`, aunque el HTML ya contiene las mismas tarjetas. Esto provoca trabajo de DOM/layout y vuelve a inicializar imágenes.
- Al filtrar la tienda o excluir el producto actual sí hace falta reconstruir el grid; ese caso se conserva.
- La cabecera y la ficha de producto instalan manejadores de `scroll` separados. La cabecera sólo necesita actualizarse una vez por frame; el sticky ya usa `requestAnimationFrame`.
- Los enlaces internos navegan con una carga completa sin preparar la siguiente página. Una precarga limitada por intención (hover/focus) puede reducir la espera sin cambiar URLs ni layout.
- La medición en producción mostró aproximadamente 1,22 s hasta DOM listo y saltos de frame de hasta 266 ms durante el primer scroll automatizado. No se observaron tareas largas de JavaScript, por lo que la prioridad es evitar renderizado redundante y preparar navegación.

## Diseño aprobado

### 1. Hidratación progresiva de tarjetas

`renderGrids()` distinguirá el primer render de una actualización dinámica. Si el grid ya contiene exactamente los productos esperados, la función conservará los nodos e imágenes servidos por HTML y sólo hidratará:

- enlaces de producto con los metadatos de analítica;
- botones de añadir al carrito, sustituyendo únicamente el enlace fallback por el control interactivo;
- clases/estado de reveal sin modificar sus transiciones;
- observadores de reveal e imagen existentes.

Si cambia el filtro, el límite, la exclusión o el estado de una promoción, se mantendrá el renderizado dinámico actual. La hidratación debe preservar el fallback sin JavaScript y no duplicar eventos al ejecutarse más de una vez.

### 2. Actualizaciones de scroll agrupadas

Se añadirá un pequeño coordinador global de scroll basado en `requestAnimationFrame`. La cabecera se suscribirá a él en lugar de ejecutar su lógica en cada evento nativo. La ficha de producto podrá usar el mismo coordinador sin duplicar lecturas de layout. No se cambiarán valores CSS, duración, easing ni keyframes.

### 3. Precarga de navegación con intención

Se añadirá un precargador de documentos internos del mismo origen. Sólo actuará después de un breve hover o al recibir foco teclado, ignorará descargas, anchors, URLs externas, enlaces ya visitados/preparados y conexiones con `saveData` o `2g`. Usará `<link rel="prefetch" as="document">` cuando el navegador lo soporte y mantendrá un límite pequeño para no competir con imágenes o analítica.

### 4. Verificación

- Pruebas unitarias/regresivas para la selección de hidratación, filtro y protección contra doble binding.
- `npm run gen`, `npm run check` y la suite completa existente.
- Servidor local fiel a producción con Playwright CLI en escritorio y móvil (390 px).
- Flujos: portada, tienda, filtros Sueño/Energía, fichas, menú móvil, carrito, checkout y navegación interna.
- Medición antes/después de navegación, DOM listo, recursos y frames durante scroll.
- Comparación visual de capturas para confirmar que no se alteraron estética ni animaciones.

## Fuera de alcance

- No se cambiarán colores, tipografías, espaciados, imágenes, keyframes, duraciones ni curvas de animación.
- No se sustituirá el sitio estático por una SPA ni se añadirá una dependencia de runtime.
- No se cambiará la lógica comercial, el catálogo, el checkout por WhatsApp ni la analítica consentida.
