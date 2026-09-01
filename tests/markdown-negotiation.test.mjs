// Negociación Accept: text/markdown — reglas de acceptmarkdown.com y RFC 9110 §12.5.1.
import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  HTML_TYPE,
  MARKDOWN_TYPE,
  markdownTwinFor,
  negotiateMediaType,
  negotiationHeaders,
  normalizePagePath,
  parseAccept,
  planResponse,
  prefersMarkdown,
  qualityFor
} from "../scripts/lib/markdown-negotiation.mjs";

test("sin cabecera Accept se sirve la representación por defecto (HTML)", () => {
  assert.equal(negotiateMediaType(undefined), HTML_TYPE);
  assert.equal(negotiateMediaType(""), HTML_TYPE);
  assert.equal(negotiateMediaType("*/*"), HTML_TYPE);
});

test("Accept: text/markdown devuelve markdown", () => {
  assert.equal(negotiateMediaType("text/markdown"), MARKDOWN_TYPE);
  assert.equal(negotiateMediaType("TEXT/MARKDOWN"), MARKDOWN_TYPE);
  assert.equal(negotiateMediaType("text/markdown, text/plain"), MARKDOWN_TYPE);
});

test("el navegador real recibe HTML", () => {
  const chrome =
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";
  assert.equal(negotiateMediaType(chrome), HTML_TYPE);
});

test("se respetan los valores q", () => {
  assert.equal(negotiateMediaType("text/markdown;q=0.9, text/html;q=0.1"), MARKDOWN_TYPE);
  assert.equal(negotiateMediaType("text/markdown;q=0.1, text/html;q=0.9"), HTML_TYPE);
  // Empate a q=1: gana la representación por defecto.
  assert.equal(negotiateMediaType("text/html, text/markdown"), HTML_TYPE);
});

test("q=0 marca la representación como inaceptable", () => {
  assert.equal(negotiateMediaType("text/markdown;q=0"), null);
  assert.equal(negotiateMediaType("text/markdown;q=0, */*;q=0.5"), HTML_TYPE);
  assert.equal(negotiateMediaType("text/html;q=0, text/markdown"), MARKDOWN_TYPE);
});

test("un tipo no soportado no es aceptable (406)", () => {
  assert.equal(negotiateMediaType("application/json"), null);
  assert.equal(negotiateMediaType("image/png, application/pdf"), null);
});

test("el rango text/* cubre ambas representaciones", () => {
  assert.equal(qualityFor("text/*", MARKDOWN_TYPE), 1);
  assert.equal(qualityFor("text/*", HTML_TYPE), 1);
  assert.equal(negotiateMediaType("text/*"), HTML_TYPE);
});

test("el rango más específico gana al más genérico", () => {
  assert.equal(qualityFor("text/markdown;q=0.2, text/*;q=1", MARKDOWN_TYPE), 0.2);
  assert.equal(qualityFor("text/markdown;q=0.2, text/*;q=1", HTML_TYPE), 1);
});

test("parseAccept ignora accept-ext posteriores a q", () => {
  const [range] = parseAccept("text/markdown;version=1;q=0.5;profile=x");
  assert.deepEqual(range, { type: "text", subtype: "markdown", q: 0.5, specificity: 2 });
});

test("parseAccept descarta entradas malformadas", () => {
  assert.deepEqual(parseAccept("texto-suelto, , text/markdown").map((r) => r.subtype), ["markdown"]);
  assert.deepEqual(parseAccept(null), []);
});

test("normalizePagePath resuelve las variantes de URL de GitHub Pages", () => {
  assert.equal(normalizePagePath("/"), "/index.html");
  assert.equal(normalizePagePath("/tienda"), "/tienda.html");
  assert.equal(normalizePagePath("/tienda.html"), "/tienda.html");
  assert.equal(normalizePagePath("/tienda/"), "/tienda.html");
  assert.equal(normalizePagePath("/about?utm=x"), "/about.html");
});

test("solo las páginas del catálogo tienen gemelo markdown", () => {
  assert.equal(markdownTwinFor("/"), "/index.md");
  assert.equal(markdownTwinFor("/about"), "/about.md");
  assert.equal(markdownTwinFor("/anti-stress.html"), "/anti-stress.md");
  assert.equal(markdownTwinFor("/css/styles.css"), null);
  assert.equal(markdownTwinFor("/assets/img/favicon.svg"), null);
  assert.equal(markdownTwinFor("/no-existe"), null);
});

test("planResponse decide qué servir", () => {
  assert.deepEqual(planResponse({ pathname: "/css/styles.css", accept: "text/markdown" }), {
    kind: "passthrough"
  });
  assert.deepEqual(planResponse({ pathname: "/", accept: "text/markdown" }), {
    kind: "markdown",
    markdownPath: "/index.md"
  });
  assert.deepEqual(planResponse({ pathname: "/", accept: "text/html" }), {
    kind: "html",
    markdownPath: "/index.md"
  });
  assert.deepEqual(planResponse({ pathname: "/", accept: "application/json" }), {
    kind: "notAcceptable",
    markdownPath: "/index.md"
  });
});

test("prefersMarkdown decide el formato del 404", () => {
  assert.equal(prefersMarkdown("text/markdown"), true);
  assert.equal(prefersMarkdown("text/markdown;q=0.9, text/html;q=0.1"), true);
  assert.equal(prefersMarkdown("text/html"), false);
  assert.equal(prefersMarkdown(undefined), false);
  assert.equal(prefersMarkdown("application/json"), false);
});

test("toda respuesta negociada declara Vary: Accept y el alternate markdown", () => {
  const headers = negotiationHeaders("/index.md");
  assert.equal(headers.Vary, "Accept, Accept-Encoding");
  assert.equal(headers.Link, '</index.md>; rel="alternate"; type="text/markdown"');
});
