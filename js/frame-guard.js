/* Evita que la tienda sea visible dentro de un frame, incluso en hosts que no
   permiten enviar CSP frame-ancestors ni X-Frame-Options (por ejemplo Pages). */
"use strict";

if (window.self === window.top) {
  document.documentElement.classList.add("top-level");
}
