// Regenera los datos estructurados que dependen de otra fuente:
//   - FAQPage en index.html      ← desde los <details> visibles de la propia página
//   - ItemList en index.html     ← desde el catálogo
//   - CollectionPage en tienda.html ← desde el catálogo
//
// Van estáticos en el HTML porque la CSP con Trusted Types impide inyectarlos por JS.
// Reejecutar tras tocar js/products.js o el FAQ de la portada:  npm run gen
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadCatalog, projectRoot as root } from "./lib/catalog.mjs";

const BASE = "https://chiclove-ec.github.io/";
const catalog = loadCatalog();
const { clSinglePrice, clFreeShippingLabel } = catalog;

const plainText = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();

// Reemplaza el bloque ld+json cuyo @type coincide, o lo inserta antes del favicon.
function upsertJsonLd(html, type, data) {
  const block = '<script type="application/ld+json">' + JSON.stringify(data) + "</script>";
  const existing = new RegExp(
    '<script type="application/ld\\+json">\\{[^<]*"@type":"' + type + '"[^<]*</script>'
  );
  if (existing.test(html)) return html.replace(existing, block);
  const anchor = '  <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">';
  return html.replace(anchor, "  " + block + "\n" + anchor);
}

/* ---------- FAQPage: se lee el FAQ visible de la portada ---------- */

const indexPath = resolve(root, "index.html");
let indexHtml = readFileSync(indexPath, "utf8");

const questions = [
  ...indexHtml.matchAll(
    /<details>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="faq-body"([^>]*)>([\s\S]*?)<\/div>\s*<\/details>/g
  )
].map(([, question, attrs, answer]) => {
  let text = plainText(answer);
  // main.js completa estas dos respuestas desde el catálogo; aquí se dejan resueltas.
  if (attrs.includes("data-free-shipping-faq")) {
    text =
      "Sí, enviamos a todo el país. Envío gratis en compras desde " +
      clFreeShippingLabel() +
      ". IVA incluido.";
  } else if (text.includes("escríbenos al o por Instagram a")) {
    text = text
      .replace("escríbenos al o", "escríbenos al " + catalog.clWhatsAppDisplay() + " o")
      .replace("por Instagram a .", "por Instagram a @" + catalog.CL_INSTAGRAM + ".");
  }
  return {
    "@type": "Question",
    name: plainText(question),
    acceptedAnswer: { "@type": "Answer", text }
  };
});

if (questions.length === 0) throw new Error("No se encontró el FAQ de la portada");

indexHtml = upsertJsonLd(indexHtml, "FAQPage", {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": BASE + "#faq",
  inLanguage: "es-EC",
  isPartOf: { "@id": BASE + "#website" },
  mainEntity: questions
});

/* ---------- ItemList de la portada y CollectionPage de la tienda ---------- */

const listItems = (image) =>
  catalog.CL_PRODUCTS.map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Product",
      name: product.name,
      description: product.tagline + " " + product.desc,
      sku: product.id,
      image: image(product),
      url: BASE + product.id + ".html",
      category: product.goalLabel,
      brand: { "@type": "Brand", name: "Chic&Love" },
      offers: {
        "@type": "Offer",
        url: BASE + product.id + ".html",
        priceCurrency: "USD",
        price: clSinglePrice(product).toFixed(2),
        availability: "https://schema.org/InStock",
        seller: { "@id": BASE + "#organization" }
      }
    }
  }));

// En la portada el ItemList vive dentro del @graph con Organization y WebSite.
const graphMatch = /<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@graph":\[\{"@type":\["Organization"[\s\S]*?)<\/script>/.exec(
  indexHtml
);
if (!graphMatch) throw new Error("No se encontró el @graph de la portada");

const graph = JSON.parse(graphMatch[1]);
const itemList = graph["@graph"].find((node) => node["@type"] === "ItemList");
if (!itemList) throw new Error("No se encontró el ItemList de la portada");
itemList.itemListElement = listItems((product) => [
  BASE + product.hero,
  BASE + product.store,
  BASE + product.splash
]);
indexHtml = indexHtml.replace(
  graphMatch[0],
  '<script type="application/ld+json">' + JSON.stringify(graph) + "</script>"
);

writeFileSync(indexPath, indexHtml);

const storePath = resolve(root, "tienda.html");
const storeHtml = upsertJsonLd(readFileSync(storePath, "utf8"), "CollectionPage", {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": BASE + "tienda.html",
  url: BASE + "tienda.html",
  name: "Tienda Chic&Love Ecuador — colección completa",
  inLanguage: "es-EC",
  isPartOf: { "@id": BASE + "#website" },
  about: { "@id": BASE + "#organization" },
  mainEntity: {
    "@type": "ItemList",
    name: "Colección Chic&Love",
    numberOfItems: catalog.CL_PRODUCTS.length,
    itemListElement: listItems((product) => BASE + product.store)
  }
});
writeFileSync(storePath, storeHtml);

console.log(
  "index.html: FAQPage con " + questions.length + " preguntas e ItemList con " +
    catalog.CL_PRODUCTS.length + " productos\n" +
    "tienda.html: CollectionPage con " + catalog.CL_PRODUCTS.length + " productos"
);
