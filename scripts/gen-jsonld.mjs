// Regenera los datos estructurados que dependen de otra fuente:
//   - FAQPage en index.html      ← desde los <details> visibles de la propia página
//   - ItemList en index.html     ← desde el catálogo
//   - CollectionPage en tienda.html ← desde el catálogo
//
// Van estáticos en el HTML para que buscadores y agentes los lean sin ejecutar JavaScript
// (y porque la CSP no admite scripts inline generados en tiempo de ejecución).
// Reejecutar tras tocar js/products.js o el FAQ de la portada:  npm run gen
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadCatalog, projectRoot as root } from "./lib/catalog.mjs";
import { loadSiteConfig, pagePath } from "./lib/site-config.mjs";

// El dominio sale de site.config.json; el build lo reescribe si se publica en otro.
const siteConfig = loadSiteConfig();
const BASE = siteConfig.base;
const CONTENT_MODIFIED = siteConfig.contentModified;
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
      url: BASE + pagePath(product.id + ".html"),
      category: product.goalLabel,
      brand: { "@type": "Brand", name: "Chic&Love" },
      offers: {
        "@type": "Offer",
        url: BASE + pagePath(product.id + ".html"),
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
itemList.isPartOf = { "@id": BASE + "#website" };
itemList.about = { "@id": BASE + "#organization" };
itemList.dateModified = CONTENT_MODIFIED;

const organization = graph["@graph"].find((node) => [].concat(node["@type"]).includes("Organization"));
const website = graph["@graph"].find((node) => node["@type"] === "WebSite");
if (!organization || !website) throw new Error("El grafo de la portada no declara Organization y WebSite");
organization.dateModified = CONTENT_MODIFIED;
organization.hasOfferCatalog = {
  "@type": "OfferCatalog",
  name: "Colección Chic&Love Ecuador",
  itemListElement: listItems((product) => BASE + product.store)
};
organization.knowsAbout = [...new Set(catalog.CL_PRODUCTS.flatMap((product) => [product.goalLabel, ...product.actives]))]
  .map((name) => ({ "@type": "Thing", name }));
website.dateModified = CONTENT_MODIFIED;
indexHtml = indexHtml.replace(
  graphMatch[0],
  '<script type="application/ld+json">' + JSON.stringify(graph) + "</script>"
);

writeFileSync(indexPath, indexHtml);

const storePath = resolve(root, "tienda.html");
const storeHtml = upsertJsonLd(readFileSync(storePath, "utf8"), "CollectionPage", {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": BASE + pagePath("tienda.html"),
  url: BASE + pagePath("tienda.html"),
  name: "Tienda Chic&Love Ecuador — colección completa",
  inLanguage: "es-EC",
  dateModified: CONTENT_MODIFIED,
  isPartOf: { "@id": BASE + "#website" },
  about: { "@id": BASE + "#organization" },
  publisher: { "@id": BASE + "#organization" },
  mainEntity: {
    "@type": "ItemList",
    name: "Colección Chic&Love",
    numberOfItems: catalog.CL_PRODUCTS.length,
    itemListElement: listItems((product) => BASE + product.store)
  }
});
writeFileSync(storePath, storeHtml);

const editorialPages = {
  "index.html": { type: "WebPage", id: BASE, name: "Chic&Love Ecuador" },
  "nosotros.html": { type: "WebPage", id: BASE + pagePath("nosotros.html"), name: "Nosotros — Chic&Love Ecuador" }
};

for (const [file, page] of Object.entries(editorialPages)) {
  const path = resolve(root, file);
  const html = readFileSync(path, "utf8");
  writeFileSync(path, upsertJsonLd(html, page.type, {
    "@context": "https://schema.org",
    "@type": page.type,
    "@id": page.id,
    url: page.id,
    name: page.name,
    inLanguage: "es-EC",
    dateModified: CONTENT_MODIFIED,
    isPartOf: { "@id": BASE + "#website" },
    about: { "@id": BASE + "#organization" },
    publisher: { "@id": BASE + "#organization" }
  }));
}

const connectedTypes = new Set(["Product", "CollectionPage", "FAQPage", "WebPage", "AboutPage", "ContactPage"]);
const allIndexablePages = [
  "index.html", "tienda.html", "nosotros.html", "about.html", "contact.html", "privacy.html", "terms.html",
  ...catalog.CL_PRODUCTS.map((product) => product.id + ".html")
];

for (const file of allIndexablePages) {
  const path = resolve(root, file);
  const html = readFileSync(path, "utf8");
  const rewritten = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (block, json) => {
    const data = JSON.parse(json);
    const nodes = data["@graph"] ?? [data];
    for (const node of nodes) {
      const types = [].concat(node["@type"]);
      if (types.includes("BreadcrumbList")) {
        node.isPartOf = { "@id": BASE + "#website" };
        node.about = { "@id": BASE + "#organization" };
        node.publisher = { "@id": BASE + "#organization" };
        node.dateModified = CONTENT_MODIFIED;
      }
      if (types.some((type) => connectedTypes.has(type))) {
        node.dateModified = CONTENT_MODIFIED;
        node.isPartOf = { "@id": BASE + "#website" };
        node.about = { "@id": BASE + "#organization" };
        node.publisher = { "@id": BASE + "#organization" };
      }
      if (types.includes("WebSite")) {
        node.dateModified = CONTENT_MODIFIED;
        node.publisher = { "@id": BASE + "#organization" };
      }
    }
    return '<script type="application/ld+json">' + JSON.stringify(data) + "</script>";
  });
  writeFileSync(path, rewritten);
}

console.log(
  "index.html: FAQPage con " + questions.length + " preguntas e ItemList con " +
    catalog.CL_PRODUCTS.length + " productos\n" +
    "tienda.html: CollectionPage con " + catalog.CL_PRODUCTS.length + " productos"
);
