// Genera una página estática por producto (/<id>.html) desde producto.html + el catálogo.
// Cada página lleva su <head> por producto (title, description, canonical, Open Graph,
// Twitter) y datos estructurados Product con oferta, para resultados enriquecidos en Google.
// La parte interactiva la sigue renderizando product-page.js (lee el id de data-product-id).
//
// Reejecutar si cambia js/products.js:  node scripts/gen-products.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://chiclove-ec.github.io/";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Cargar el catálogo y los helpers de precio evaluando products.js en un sandbox.
const productsSrc = readFileSync(resolve(root, "js/products.js"), "utf8").replace(/^\s*"use strict";/, "");
const catalog = {};
new Function(
  "Date",
  productsSrc + "\nthis.CL_PRODUCTS=CL_PRODUCTS; this.clSinglePrice=clSinglePrice; this.clIsJulyPromoActive=clIsJulyPromoActive;"
).call(catalog, Date);

const template = readFileSync(resolve(root, "producto.html"), "utf8");
const setMeta = (html, id, value) =>
  html.replace(new RegExp('(<meta [^>]*id="' + id + '"[^>]*content=")[^"]*(")'), "$1" + esc(value) + "$2");

let count = 0;
for (const p of catalog.CL_PRODUCTS) {
  const url = BASE + p.id + ".html";
  const title = p.name + " — Chic&Love Ecuador";
  const metaDesc = p.desc + " Sabor " + p.flavor.toLowerCase() + ", 60 gummies. Envíos a todo Ecuador.";
  const ogDesc = p.tagline + " " + p.desc;
  const imgAlt = "Frasco de " + p.name;
  const promo = catalog.clIsJulyPromoActive();

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: ogDesc,
    sku: p.id,
    image: [BASE + p.hero, BASE + p.store, BASE + p.splash],
    brand: { "@type": "Brand", name: "Chic&Love" },
    category: p.goalLabel,
    url: url,
    offers: {
      "@type": "Offer",
      url: url,
      priceCurrency: "USD",
      price: catalog.clSinglePrice(p).toFixed(2),
      priceValidUntil: promo ? "2026-08-01" : "2027-07-31",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": BASE + "#organization" }
    }
  };

  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(title) + "</title>");
  html = setMeta(html, "pd-description", metaDesc);
  html = html.replace(/(<link rel="canonical" id="pd-canonical" href=")[^"]*(")/, "$1" + url + "$2");
  html = setMeta(html, "pd-og-title", title);
  html = setMeta(html, "pd-og-description", ogDesc);
  html = setMeta(html, "pd-og-url", url);
  html = setMeta(html, "pd-og-image", BASE + p.hero);
  html = setMeta(html, "pd-og-image-alt", imgAlt);
  html = setMeta(html, "pd-tw-image", BASE + p.hero);
  html = html.replace(
    /<img id="pd-img"[^>]*>/,
    '<img id="pd-img" src="' + p.heroSmall + '" srcset="' + p.heroSmall + " 640w, " + p.hero +
      ' 1080w" sizes="(max-width: 720px) 84vw, (max-width: 1024px) 440px, 520px" alt="' + esc(imgAlt) +
      '" width="1080" height="1350" decoding="async" fetchpriority="high">'
  );
  html = html.replace('<body class="page-product">', '<body class="page-product" data-product-id="' + p.id + '">');
  const favAnchor = '  <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">';
  html = html.replace(favAnchor, '  <script type="application/ld+json">' + JSON.stringify(productLd) + "</script>\n" + favAnchor);

  writeFileSync(resolve(root, p.id + ".html"), html);
  count++;
}
console.log("Generadas " + count + " páginas de producto: " + catalog.CL_PRODUCTS.map((p) => p.id + ".html").join(", "));
