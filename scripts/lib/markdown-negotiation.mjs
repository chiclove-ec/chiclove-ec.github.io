// Negociación de contenido `Accept: text/markdown` (acceptmarkdown.com + RFC 9110 §12.5.1).
//
// Módulo puro y sin dependencias: lo usan el middleware de Cloudflare Pages
// (functions/_middleware.js) y el servidor local de verificación (scripts/serve.mjs),
// de modo que lo que se prueba en local es exactamente lo que corre en producción.

export const HTML_TYPE = "text/html";
export const MARKDOWN_TYPE = "text/markdown";
export const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

// El HTML va primero: es la representación por defecto y gana los empates de calidad.
export const AVAILABLE_TYPES = [HTML_TYPE, MARKDOWN_TYPE];

// Páginas con gemelo markdown. La clave es el archivo HTML publicado.
export const MARKDOWN_TWINS = Object.freeze({
  "/index.html": "/index.md",
  "/tienda.html": "/tienda.md",
  "/nosotros.html": "/nosotros.md",
  "/about.html": "/about.md",
  "/contact.html": "/contact.md",
  "/privacy.html": "/privacy.md",
  "/hair-nails-forte.html": "/hair-nails-forte.md",
  "/radiant-skin.html": "/radiant-skin.md",
  "/vinagre-de-manzana.html": "/vinagre-de-manzana.md",
  "/sleep-vitamins.html": "/sleep-vitamins.md",
  "/sexual-booster-women.html": "/sexual-booster-women.md",
  "/sexual-booster-men.html": "/sexual-booster-men.md",
  "/anti-stress.html": "/anti-stress.md"
});

/** Normaliza la ruta pedida al archivo HTML publicado que le corresponde. */
export function normalizePagePath(pathname) {
  if (typeof pathname !== "string" || pathname === "") return null;
  let path = pathname.split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = "/" + path;
  if (path === "/") return "/index.html";
  if (path.endsWith("/")) path = path.slice(0, -1) + ".html";
  if (!path.includes(".")) path += ".html";
  return path;
}

/** Devuelve la ruta del gemelo markdown de una página, o null si no tiene. */
export function markdownTwinFor(pathname) {
  const page = normalizePagePath(pathname);
  return page && Object.prototype.hasOwnProperty.call(MARKDOWN_TWINS, page)
    ? MARKDOWN_TWINS[page]
    : null;
}

/**
 * Parsea una cabecera Accept en rangos de medios ordenados por especificidad.
 * `text/markdown` (2) es más específico que `text/*` (1), que a su vez lo es más que `*​/*` (0).
 */
export function parseAccept(header) {
  if (typeof header !== "string") return [];
  return header
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawRange, ...params] = entry.split(";").map((part) => part.trim());
      const [type = "", subtype = ""] = rawRange.toLowerCase().split("/");
      if (!type || !subtype) return null;

      // El primer parámetro `q` cierra los parámetros de medio; lo que sigue es accept-ext.
      let q = 1;
      for (const param of params) {
        const match = /^q=(.*)$/i.exec(param);
        if (!match) continue;
        const value = Number.parseFloat(match[1]);
        q = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 1;
        break;
      }

      const specificity = type === "*" ? 0 : subtype === "*" ? 1 : 2;
      return { type, subtype, q, specificity };
    })
    .filter(Boolean)
    .sort((a, b) => b.specificity - a.specificity || b.q - a.q);
}

/** Calidad que la cabecera Accept asigna a un tipo concreto (0 = inaceptable). */
export function qualityFor(header, mediaType) {
  const ranges = parseAccept(header);
  if (ranges.length === 0) return 1; // Sin Accept: cualquier representación sirve.
  const [type, subtype] = String(mediaType).toLowerCase().split("/");

  let best = null;
  for (const range of ranges) {
    const matches =
      (range.type === "*" && range.subtype === "*") ||
      (range.type === type && range.subtype === "*") ||
      (range.type === type && range.subtype === subtype);
    if (!matches) continue;
    // Gana el rango más específico; a igual especificidad, la q más alta.
    if (!best || range.specificity > best.specificity) best = range;
  }
  return best ? best.q : 0;
}

/**
 * Elige la representación a servir. Devuelve el tipo elegido o null si no hay
 * ninguna aceptable (el llamador debe responder 406).
 */
export function negotiateMediaType(header, available = AVAILABLE_TYPES) {
  let chosen = null;
  let chosenQ = 0;
  for (const candidate of available) {
    const q = qualityFor(header, candidate);
    if (q > chosenQ) {
      chosen = candidate;
      chosenQ = q;
    }
  }
  return chosen;
}

/** true si el cliente prefiere markdown (se usa también para el 404). */
export function prefersMarkdown(accept) {
  return negotiateMediaType(accept) === MARKDOWN_TYPE;
}

/**
 * Decide qué hacer con una petición.
 *  - `passthrough`: no es una página con gemelo markdown (assets, sitemap, llms.txt…).
 *  - `html`: servir el HTML tal cual.
 *  - `markdown`: servir `markdownPath` como text/markdown.
 *  - `notAcceptable`: el cliente excluyó ambas representaciones → 406.
 * En los tres últimos casos la respuesta debe llevar `Vary: Accept`.
 */
export function planResponse({ pathname, accept }) {
  const markdownPath = markdownTwinFor(pathname);
  if (!markdownPath) return { kind: "passthrough" };

  const chosen = negotiateMediaType(accept);
  if (chosen === MARKDOWN_TYPE) return { kind: "markdown", markdownPath };
  if (chosen === HTML_TYPE) return { kind: "html", markdownPath };
  return { kind: "notAcceptable", markdownPath };
}

/** Cabeceras comunes a toda respuesta negociada. */
export function negotiationHeaders(markdownPath) {
  return {
    Vary: "Accept, Accept-Encoding",
    Link: `<${markdownPath}>; rel="alternate"; type="text/markdown"`
  };
}
