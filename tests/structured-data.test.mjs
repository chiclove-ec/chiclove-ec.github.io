// Los datos estructurados van estáticos en el HTML (buscadores y agentes los leen sin
// inyectarlos por JS), así que las pruebas son la única defensa contra que se
// desincronicen del catálogo o del contenido visible de la página.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { loadCatalog, projectRoot } from "../scripts/lib/catalog.mjs";
import { loadSiteConfig, pagePath } from "../scripts/lib/site-config.mjs";

const BASE = loadSiteConfig().base;
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

const primaryTypes = new Set(["Product", "CollectionPage", "FAQPage", "WebPage", "AboutPage", "ContactPage"]);
const nodesOfType = (file, types) =>
  jsonLd(file).filter((node) => [].concat(node["@type"]).some((type) => types.has(type)));

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
      assert.equal(entry.item.url, BASE + pagePath(product.id + ".html"), `${label}: URL`);
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
    assert.equal(returns.merchantReturnLink, BASE + pagePath("terms.html"), `${product.id}: enlace`);
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
  assert.equal(org.legalName, catalog.CL_LEGAL.company, "razón social");
  assert.equal(org.taxID, catalog.CL_LEGAL.ruc, "RUC");
  assert.ok(org.alternateName.includes("Chic&Love"), "faltan alias de marca");
  assert.ok(org.alternateName.length >= 3, "pocos alias para desambiguar la marca");
  assert.ok(org.sameAs.includes("https://www.instagram.com/" + catalog.CL_INSTAGRAM));
  assert.equal(org.areaServed.name, "Ecuador");
  assert.equal(org.address.addressCountry, "EC");
  assert.equal(org.address.streetAddress, catalog.CL_LEGAL.streetAddress);
  assert.equal(org.address.addressLocality, catalog.CL_LEGAL.locality);
  assert.equal(org.address.addressRegion, catalog.CL_LEGAL.region);
  assert.equal(org.currenciesAccepted, "USD");
  assert.equal(org.paymentAccepted, "Transferencia bancaria");
  assert.match(org.contactPoint.url, new RegExp("wa\\.me/" + catalog.CL_WHATSAPP));
  assert.ok(org.hasOfferCatalog, "falta hasOfferCatalog");
  assert.equal(org.hasOfferCatalog.itemListElement.length, catalog.CL_PRODUCTS.length);
});

test("cada Product publica identidad, imagen, precio, envío y devoluciones", () => {
  for (const product of catalog.CL_PRODUCTS) {
    const node = byType(product.id + ".html", "Product");
    assert.equal(node.category, product.goalLabel, `${product.id}: categoría`);
    assert.equal(node.brand.name, "Chic&Love", `${product.id}: marca`);
    assert.equal(node.sku, product.id, `${product.id}: SKU`);
    assert.ok([].concat(node.image).length > 0, `${product.id}: imagen`);

    const offer = node.offers;
    assert.equal(offer.priceSpecification["@type"], "UnitPriceSpecification", `${product.id}: priceSpecification`);
    assert.equal(offer.priceSpecification.priceCurrency, "USD", `${product.id}: moneda del precio`);
    assert.equal(offer.priceSpecification.valueAddedTaxIncluded, true, `${product.id}: IVA`);
    assert.equal(offer.shippingDetails["@type"], "OfferShippingDetails", `${product.id}: shippingDetails`);
    assert.ok(offer.hasMerchantReturnPolicy, `${product.id}: política de devoluciones`);
  }
});

test("la navegación estructurada incluye las páginas de confianza", () => {
  for (const page of ["index.html", "tienda.html", "nosotros.html"]) {
    const nav = jsonLd(page).filter((node) =>
      [].concat(node["@type"]).includes("SiteNavigationElement")
    );
    const urls = nav.map((node) => node.url);
    assert.ok(urls.includes(BASE + pagePath("contact.html")), `${page}: falta Contacto`);
    assert.ok(urls.includes(BASE + pagePath("about.html")), `${page}: falta Información de la empresa`);
  }
});

test("las entidades editoriales usan la fecha configurada y los mismos IDs", () => {
  const { contentModified } = loadSiteConfig();
  const organizationId = BASE + "#organization";
  const websiteId = BASE + "#website";
  const pages = [
    "index.html",
    "tienda.html",
    "nosotros.html",
    "about.html",
    "contact.html",
    "privacy.html",
    "terms.html",
    ...catalog.CL_PRODUCTS.map((product) => product.id + ".html")
  ];

  for (const page of pages) {
    for (const node of nodesOfType(page, primaryTypes)) {
      assert.equal(node.dateModified, contentModified, `${page}: fecha desincronizada en ${node["@type"]}`);
      const types = [].concat(node["@type"]);
      if (types.some((type) => ["Product", "FAQPage", "CollectionPage", "WebPage", "AboutPage", "ContactPage"].includes(type))) {
        assert.equal(node.isPartOf?.["@id"], websiteId, `${page}: isPartOf`);
        assert.equal(node.about?.["@id"], organizationId, `${page}: about`);
      }
      if (!types.includes("Product")) {
        assert.equal(node.publisher?.["@id"], organizationId, `${page}: publisher`);
      }
    }
  }

  const org = byType("index.html", "Organization");
  const website = byType("index.html", "WebSite");
  assert.equal(org["@id"], organizationId);
  assert.equal(website["@id"], websiteId);
  assert.equal(website.publisher?.["@id"], organizationId);
  assert.equal(website.dateModified, contentModified);
  assert.ok(!jsonLd("index.html").some((node) => "aggregateRating" in node));
});

test("el sitemap usa la fecha configurada exclusivamente en URLs indexables", () => {
  const { contentModified } = loadSiteConfig();
  const sitemap = read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => entry);
  assert.ok(urls.length > 0, "sitemap vacío");
  for (const entry of urls) {
    assert.match(entry, new RegExp("<lastmod>" + contentModified + "</lastmod>"));
    assert.doesNotMatch(entry, /(?:\.md|404\.html|producto\.html)/);
  }
});

/* ---------- Fragmentos de producto: sin valoraciones inventadas ---------- */

// Todas las páginas que publican algún nodo Product, esté al nivel que esté.
const PRODUCT_PAGES = [
  "index.html",
  "tienda.html",
  ...catalog.CL_PRODUCTS.map((product) => product.id + ".html")
];

/** Todo nodo Product de una página, incluidos los anidados en listas y ofertas. */
function productNodes(file) {
  const found = [];
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const types = [].concat(node["@type"] ?? []);
    if (types.includes("Product")) found.push(node);
    for (const value of Object.values(node)) walk(value);
  })(jsonLd(file));
  return found;
}

/** Cualquier nodo del JSON-LD de una página, para barrer propiedades prohibidas. */
function everyNode(file) {
  const found = [];
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    found.push(node);
    for (const value of Object.values(node)) walk(value);
  })(jsonLd(file));
  return found;
}

// Search Console avisa de que a los fragmentos de producto les faltan `aggregateRating`
// y `review`. Son avisos NO críticos: la ficha ya califica por `offers`. La única forma
// legítima de cerrarlos es tener reseñas reales y visibles en la página; publicarlas sin
// tenerlas es «spammy structured markup» y se castiga con acción manual, que sí retira
// los resultados enriquecidos. Mientras el catálogo no tenga reseñas, no se publica ni
// una valoración. Para cerrar el aviso de verdad: añadir las reseñas reales al catálogo,
// renderizarlas visibles en la ficha, y entonces —y solo entonces— relajar esta prueba.
const RATING_PROPERTIES = [
  "aggregateRating",
  "review",
  "reviews",
  "ratingValue",
  "reviewCount",
  "ratingCount",
  "bestRating",
  "worstRating"
];

test("ninguna página publica valoraciones que el sitio no muestra", () => {
  for (const page of [...PRODUCT_PAGES, "nosotros.html", "about.html", "contact.html"]) {
    for (const node of everyNode(page)) {
      for (const property of RATING_PROPERTIES) {
        assert.ok(
          !(property in node),
          `${page} publica "${property}" en un nodo ${[].concat(node["@type"] ?? "?").join("+")}, ` +
            "pero el sitio no muestra ninguna reseña. Marcar valoraciones inexistentes es " +
            "motivo de acción manual en Google. Si ya hay reseñas reales, publícalas visibles " +
            "en la ficha primero y actualiza esta prueba a conciencia."
        );
      }
    }
  }
});

test("el catálogo no guarda contadores de reseñas sin respaldo", () => {
  // Hubo un campo `reviews: 214` por producto que ninguna página mostraba. Un número
  // así acaba publicado como `aggregateRating` por quien lo encuentre y lo dé por bueno.
  for (const product of catalog.CL_PRODUCTS) {
    for (const property of RATING_PROPERTIES) {
      assert.ok(
        !(property in product),
        `${product.id} declara "${property}" en js/products.js. Si son reseñas reales, ` +
          "deben traer texto y autor y verse en la ficha; si no lo son, no deben existir."
      );
    }
  }
});

test("ningún nodo Product se publica a medias", () => {
  // Un Product con solo nombre y URL es, para Google, otro producto sin precio: lo
  // denuncia como fragmento incompleto. Las referencias a otra ficha se hacen con
  // `@id` a secas, que es una referencia y no una definición.
  for (const page of PRODUCT_PAGES) {
    for (const node of productNodes(page)) {
      assert.ok(node.offers, `${page}: hay un Product sin oferta (${node.name ?? node["@id"] ?? "sin nombre"})`);
      assert.ok(node["@id"], `${page}: hay un Product sin @id (${node.name})`);
      assert.ok(node.name, `${page}: hay un Product sin nombre (${node["@id"]})`);
    }
  }
});

test("cada producto es una sola entidad en todo el sitio", () => {
  // La ficha, la portada y la tienda describen el mismo producto. Con el mismo `@id`
  // en los tres sitios, Google y cualquier modelo lo leen como una entidad, no como
  // tres parecidas.
  for (const product of catalog.CL_PRODUCTS) {
    const expected = BASE + pagePath(product.id + ".html") + "#product";
    for (const page of PRODUCT_PAGES) {
      for (const node of productNodes(page).filter((n) => n.name === product.name)) {
        assert.equal(
          node["@id"],
          expected,
          `${page}: ${product.name} se publica con otra identidad que su ficha canónica`
        );
      }
    }
  }
});
