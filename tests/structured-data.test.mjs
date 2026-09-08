// Los datos estructurados van estáticos en el HTML (la CSP con Trusted Types impide
// inyectarlos por JS), así que las pruebas son la única defensa contra que se
// desincronicen del catálogo o del contenido visible de la página.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { loadCatalog, projectRoot } from "../scripts/lib/catalog.mjs";

const BASE = "https://chiclove-ec.github.io/";
const catalog = loadCatalog();
const read = (file) => readFileSync(resolve(projectRoot, file), "utf8");

function jsonLd(file) {
  return [...read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, json]) => JSON.parse(json))
    .flatMap((data) => (data["@graph"] ? data["@graph"] : [data]));
}

const byType = (file, type) =>
  jsonLd(file).find((node) => [].concat(node["@type"]).includes(type));

const plainText = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();

test("todo el JSON-LD publicado es válido", () => {
  const pages = ["index.html", "tienda.html", "nosotros.html", "about.html", "contact.html", "privacy.html", ...catalog.CL_PRODUCTS.map((p) => p.id + ".html")];
  for (const page of pages) {
    assert.ok(jsonLd(page).length > 0, `${page} no publica datos estructurados`);
  }
});

test("el FAQPage de la portada coincide con las preguntas visibles", () => {
  const html = read("index.html");
  const faq = byType("index.html", "FAQPage");
  assert.ok(faq, "falta el FAQPage");

  const visible = [
    ...html.matchAll(
      /<details>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="faq-body"([^>]*)>([\s\S]*?)<\/div>\s*<\/details>/g
    )
  ];
  assert.equal(faq.mainEntity.length, visible.length, "el FAQPage no cubre todas las preguntas");

  visible.forEach(([, question, attrs, answer], index) => {
    const node = faq.mainEntity[index];
    assert.equal(node.name, plainText(question), "pregunta desincronizada");

    // Dos respuestas las completa main.js desde el catálogo: se comparan ya resueltas.
    if (attrs.includes("data-free-shipping-faq")) {
      assert.ok(
        node.acceptedAnswer.text.includes(catalog.clFreeShippingLabel()),
        "la respuesta de envíos no publica el umbral vigente"
      );
      return;
    }
    const expected = plainText(answer);
    if (expected.includes("escríbenos al o por Instagram")) {
      assert.ok(node.acceptedAnswer.text.includes(catalog.clWhatsAppDisplay()), "falta el teléfono");
      assert.ok(node.acceptedAnswer.text.includes("@" + catalog.CL_INSTAGRAM), "falta Instagram");
      return;
    }
    assert.equal(node.acceptedAnswer.text, expected, "respuesta desincronizada");
  });
});

test("los ItemList de portada y tienda reflejan el catálogo completo", () => {
  const home = byType("index.html", "ItemList");
  const store = byType("tienda.html", "CollectionPage");
  assert.ok(home, "falta el ItemList de la portada");
  assert.ok(store, "falta el CollectionPage de la tienda");

  for (const [label, list] of [["portada", home], ["tienda", store.mainEntity]]) {
    assert.equal(
      list.itemListElement.length,
      catalog.CL_PRODUCTS.length,
      `${label}: número de productos`
    );
    catalog.CL_PRODUCTS.forEach((product, index) => {
      const entry = list.itemListElement[index];
      assert.equal(entry.position, index + 1, `${label}: posición`);
      assert.equal(entry.item.name, product.name, `${label}: nombre`);
      assert.equal(entry.item.url, BASE + product.id + ".html", `${label}: URL`);
      assert.equal(entry.item.category, product.goalLabel, `${label}: categoría`);
      assert.equal(
        entry.item.description,
        product.tagline + " " + product.desc,
        `${label}: descripción`
      );
    });
  }
});

test("las ofertas de la tienda publican el precio vigente", () => {
  const store = byType("tienda.html", "CollectionPage");
  catalog.CL_PRODUCTS.forEach((product, index) => {
    const offer = store.mainEntity.itemListElement[index].item.offers;
    assert.equal(offer.price, catalog.clSinglePrice(product).toFixed(2), product.id);
    assert.equal(offer.priceCurrency, "USD");
    assert.equal(offer.availability, "https://schema.org/InStock");
  });
});

test("cada página de producto publica oferta, envío y vendedor", () => {
  for (const product of catalog.CL_PRODUCTS) {
    const node = byType(product.id + ".html", "Product");
    assert.ok(node, `${product.id}: falta el Product`);
    assert.equal(node.offers.price, catalog.clSinglePrice(product).toFixed(2), product.id);
    assert.equal(node.offers.seller["@id"], BASE + "#organization", `${product.id}: vendedor`);

    const shipping = node.offers.shippingDetails;
    assert.equal(shipping.shippingDestination.addressCountry, "EC", `${product.id}: destino`);
    assert.equal(shipping.shippingRate.value, "0", `${product.id}: tarifa`);
    assert.equal(
      shipping.eligibleTransactionVolume.minPrice,
      catalog.CL_FREE_SHIPPING.toFixed(2),
      `${product.id}: umbral de envío gratis`
    );

    const returns = node.offers.hasMerchantReturnPolicy;
    assert.equal(returns.applicableCountry, "EC", `${product.id}: país de la política`);
    assert.equal(
      returns.returnPolicyCategory,
      "https://schema.org/MerchantReturnFiniteReturnWindow",
      `${product.id}: la política publicada debe ser la ventana de devolución`
    );
    assert.equal(
      returns.merchantReturnDays,
      catalog.CL_LEGAL.returnDays,
      `${product.id}: los días de devolución deben salir del catálogo`
    );
    assert.equal(returns.merchantReturnLink, BASE + "terms.html", `${product.id}: enlace`);
  }
});

test("la política de devoluciones se dice en texto allí donde se busca", () => {
  // La ventana de 15 días es el compromiso comercial: si desaparece de alguna página,
  // el sitio vuelve a contradecirse sobre lo que puede hacer quien ya compró.
  const window = new RegExp("(devolución|devoluciones|cambio).{0,120}" + catalog.CL_LEGAL.returnDays + " días", "is");
  const files = [
    "contact.html", "contact.md", "about.html", "about.md", "index.html",
    "tienda.md", "terms.html", "terms.md",
    ...catalog.CL_PRODUCTS.map((p) => p.id + ".md")
  ];
  for (const file of files) {
    assert.match(read(file), window, `${file} no declara la ventana de devolución`);
  }
  // La excepción por pedido dañado no puede perderse: es lo que evita dejar sin salida.
  for (const file of ["contact.html", "contact.md", "terms.html", "terms.md"]) {
    assert.match(read(file), /dañado, incompleto o/i, `${file} no explica la excepción`);
  }
  // Y nada puede seguir diciendo lo contrario.
  const denied = /(no (se )?acept(amos|an) devoluciones|sin devoluciones|venta (es )?final)/i;
  for (const file of [...files, "llms.txt", "llms-full.txt", "agents.md", "privacy.html", "privacy.md"]) {
    assert.ok(!denied.test(read(file)), `${file} sigue negando las devoluciones`);
  }
});

test("la Organization declara alias de marca, contacto y ubicación", () => {
  const org = byType("index.html", "Organization");
  assert.ok(org.alternateName.includes("Chic&Love"), "faltan alias de marca");
  assert.ok(org.alternateName.length >= 3, "pocos alias para desambiguar la marca");
  assert.ok(org.sameAs.includes("https://www.instagram.com/" + catalog.CL_INSTAGRAM));
  assert.equal(org.address.addressCountry, "EC");
  assert.match(org.contactPoint.url, new RegExp("wa\\.me/" + catalog.CL_WHATSAPP));
});

test("la navegación estructurada incluye las páginas de confianza", () => {
  for (const page of ["index.html", "tienda.html", "nosotros.html"]) {
    const nav = jsonLd(page).filter((node) =>
      [].concat(node["@type"]).includes("SiteNavigationElement")
    );
    const urls = nav.map((node) => node.url);
    assert.ok(urls.includes(BASE + "contact.html"), `${page}: falta Contacto`);
    assert.ok(urls.includes(BASE + "about.html"), `${page}: falta Información de la empresa`);
  }
});
