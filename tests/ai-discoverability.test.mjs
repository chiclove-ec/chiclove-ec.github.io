// Contratos de descubribilidad: el contenido esencial debe estar en el HTML inicial
// y las páginas citables deben declarar sus representaciones para máquinas.
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { loadCatalog, projectRoot } from "../scripts/lib/catalog.mjs";
import { loadSiteConfig } from "../scripts/lib/site-config.mjs";
import { MARKDOWN_TWINS } from "../scripts/lib/markdown-negotiation.mjs";
import { loadPublicFiles } from "./public-files.mjs";

const BASE = loadSiteConfig().base;
const catalog = loadCatalog();
const read = (file) => readFileSync(resolve(projectRoot, file), "utf8");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeHtml = (value) => value.replaceAll("&", "&amp;");

function initialCards(file) {
  return [...read(file).matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)]
    .map((match) => match[0])
    .filter((card) => /\bpcard\b/i.test(card));
}

test("la portada y la tienda publican una tarjeta inicial completa por producto", () => {
  for (const page of ["index.html", "tienda.html"]) {
    const cards = initialCards(page);
    assert.equal(cards.length, catalog.CL_PRODUCTS.length, `${page}: número de tarjetas`);

    const ids = cards.map((card) => card.match(/data-product-id="([^"]+)"/)?.[1]);
    assert.deepEqual(ids, catalog.CL_PRODUCTS.map((product) => product.id), `${page}: productos`);

    cards.forEach((card, index) => {
      const product = catalog.CL_PRODUCTS[index];
      const canonical = BASE + product.id + ".html";
      assert.match(card, new RegExp('data-product-id="' + escapeRegExp(product.id) + '"'));
      assert.match(card, new RegExp('href="' + escapeRegExp(canonical) + '"'));
      assert.ok(card.includes(escapeHtml(product.name)), `${page}/${product.id}: nombre`);
      assert.ok(card.includes(product.goalLabel), `${page}/${product.id}: objetivo`);
      assert.ok(card.includes(product.flavor), `${page}/${product.id}: sabor`);
      assert.match(card, /60 gummies/i, `${page}/${product.id}: cantidad`);
      assert.ok(card.includes(catalog.clMoney(catalog.clSinglePrice(product))), `${page}/${product.id}: precio`);
      assert.match(card, /IVA incluido/i, `${page}/${product.id}: IVA`);
      assert.doesNotMatch(card, /\bstyle\s*=/i, `${page}/${product.id}: no style inline`);
      assert.doesNotMatch(card, /<script\b/i, `${page}/${product.id}: no script inline`);
    });
  }
});

test("todas las páginas indexables declaran idioma, indexación, canónica y gemelo markdown", () => {
  for (const [htmlPath, markdownPath] of Object.entries(MARKDOWN_TWINS)) {
    const page = htmlPath.slice(1);
    const html = read(page);
    assert.match(html, /^<html lang="es-EC">/m, `${page}: idioma regional`);
    assert.match(html, /<meta name="robots" content="index,follow(?:,[^"]*)?">/, `${page}: robots indexable`);
    const canonical = BASE + (page === "index.html" ? "" : page);
    assert.match(html, new RegExp('<link rel="canonical"[^>]*href="' + escapeRegExp(canonical) + '"'));
    assert.match(
      html,
      new RegExp('<link rel="alternate" type="text/markdown" href="' + escapeRegExp(BASE + markdownPath.slice(1)) + '"'),
      `${page}: gemelo markdown`
    );
  }
});

test("ai.txt existe y está publicado por la lista blanca del build", () => {
  assert.ok(existsSync(resolve(projectRoot, "ai.txt")), "falta ai.txt");
  assert.ok(loadPublicFiles().has("ai.txt"), "ai.txt no está en la lista blanca del build");
});
