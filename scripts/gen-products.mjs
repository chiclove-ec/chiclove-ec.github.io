// Genera, desde el catálogo (js/products.js), todo lo que depende de él:
//   - /<id>.html   página estática por producto (desde la plantilla producto.html)
//   - /<id>.md     gemelo markdown del producto
//   - /index.md    resumen del sitio en markdown
//   - /tienda.md   catálogo completo en markdown
//   - /agents.md   instrucciones para agentes
//   - /llms-full.txt  todo el contenido markdown del sitio en un solo archivo
//
// Cada página de producto lleva su <head> propio (title, description, canonical, alternate
// markdown, Open Graph, Twitter) y datos estructurados Product con oferta y envío, para
// resultados enriquecidos. La parte interactiva la renderiza product-page.js (data-product-id).
//
// Reejecutar si cambia js/products.js:  npm run gen:products
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadCatalog, projectRoot as root } from "./lib/catalog.mjs";
import { loadSiteConfig } from "./lib/site-config.mjs";

// El dominio sale de site.config.json; el build lo reescribe si se publica en otro.
const BASE = loadSiteConfig().base;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const catalog = loadCatalog();
const { clMoney, clSinglePrice, clActivePromo, clHasPacks, clFreeShippingLabel, clPromoPercent } = catalog;

const template = readFileSync(resolve(root, "producto.html"), "utf8");
const setMeta = (html, id, value) =>
  html.replace(new RegExp('(<meta [^>]*id="' + id + '"[^>]*content=")[^"]*(")'), "$1" + esc(value) + "$2");

// La plantilla trae el contenido de Hair & Nails Forte; cada ficha debe sobrescribirlo
// para que el HTML servido ya sea el del producto correcto, sin esperar a JavaScript.
// `replaceInner` cambia lo que hay entre la etiqueta con ese id y su cierre; ninguno de
// los contenedores afectados anida otra etiqueta del mismo nombre, así que basta con
// buscar el primer cierre.
function replaceInner(html, id, inner) {
  const pattern = new RegExp('(<([a-z0-9]+)\\b[^>]*\\bid="' + id + '"[^>]*>)[\\s\\S]*?(</\\2>)');
  if (!pattern.test(html)) throw new Error("No se encontró el elemento #" + id + " en la plantilla");
  return html.replace(pattern, (match, open, tag, close) => open + inner + close);
}

const setText = (html, id, value) => replaceInner(html, id, esc(value));

// Espeja el marcado que product-page.js genera para las variantes, de modo que el
// precio (y la promo) ya se lean en el HTML servido y no cambien al hidratar.
function variantsMarkup(p) {
  const singlePrice = clSinglePrice(p);
  const promo = clActivePromo(p);
  const variants = [
    {
      name: "1 frasco",
      sub: promo
        ? "Antes " + clMoney(p.price) + ", ahorras " + clMoney(p.price - singlePrice)
        : "60 gummies para 1 mes",
      price: singlePrice,
      badge: promo ? "−" + clPromoPercent(p) + "%" : ""
    }
  ];
  if (clHasPacks(p)) {
    variants.push(
      { name: "Pack x2 frascos", sub: "Antes " + clMoney(p.price * 2), price: p.pricePack, badge: "Ahorra " + clMoney(p.price * 2 - p.pricePack) },
      { name: "Pack x3 frascos", sub: "Antes " + clMoney(p.price * 3), price: p.pricePack3, badge: "Ahorra " + clMoney(p.price * 3 - p.pricePack3) }
    );
  }
  return variants
    .map((v, index) => {
      const selected = index === 0;
      return '<button type="button" class="variant-opt' + (selected ? " on" : " featured") +
        '" role="radio" aria-checked="' + (selected ? "true" : "false") + '" tabindex="' +
        (selected ? "0" : "-1") + '"><span><span class="v-name">' + esc(v.name) +
        (v.badge ? '<span class="save">' + esc(v.badge) + "</span>" : "") +
        '</span><br><span class="v-sub">' + esc(v.sub) + '</span></span>' +
        '<span class="v-price-box"><span class="v-price">' + esc(clMoney(v.price)) +
        '</span><span class="v-vat">' + esc(catalog.CL_VAT_NOTE) + "</span></span></button>";
    })
    .join("");
}

// Durante una promo de solo frasco el sitio retira los packs (al precio promocional
// ya no ahorran). Los gemelos markdown no pueden seguir anunciándolos: contradirían
// lo que realmente se puede comprar.
function priceDetail(p) {
  if (clHasPacks(p)) {
    return clMoney(clSinglePrice(p)) + ", pack x2 " + clMoney(p.pricePack) +
      ", pack x3 " + clMoney(p.pricePack3);
  }
  const promo = clActivePromo(p);
  return clMoney(clSinglePrice(p)) + " (promoción hasta el " + promo.endsLabel +
    ", antes " + clMoney(p.price) + "; los packs no se ofrecen mientras dure)";
}

// Gemelo markdown que se sirve en /<id>.md y por `Accept: text/markdown`.
function productMarkdown(p, url) {
  const whatsapp = catalog.clWhatsAppDisplay();
  return [
    "# " + p.name + " — Chic&Love Ecuador",
    "",
    "> " + p.tagline + " " + p.desc,
    "",
    "- **Precio:** " + priceDetail(p) + ", frasco de 60 gummies",
    "- **Disponibilidad:** en stock, envíos a todo Ecuador. Envío gratis en compras desde " +
      clFreeShippingLabel() + ". IVA incluido.",
    "- **Objetivo:** " + p.goalLabel,
    "- **Sabor:** " + p.flavor,
    "- **Dosis recomendada:** " + p.dose,
    "- **Distintivos:** " + p.badges.join(", "),
    "- **Activos:** " + p.actives.join(", "),
    "",
    "## Beneficios",
    "",
    ...p.benefits.map((benefit) => "- " + benefit),
    "",
    "## Cómo comprarlo",
    "",
    "Tu carrito se prepara directamente en tu navegador. Cuando pulsas «Finalizar pedido»,",
    "continúas en WhatsApp con el detalle de tu compra listo para enviar. Allí confirmamos",
    "disponibilidad, dirección de entrega y datos para la transferencia. La web no procesa pagos",
    "con tarjeta. Los precios publicados incluyen IVA y son los vigentes en la tienda. Antes de",
    "confirmar tu pedido podrás revisar el total de tu compra. Ver [/contact.md](" + BASE + "contact.md).",
    "",
    "**Devoluciones y cambios:** puedes solicitarlos dentro de los 15 días posteriores a recibir",
    "tu pedido, siempre que el producto esté en el mismo estado en que lo recibiste. Por seguridad",
    "e higiene, el frasco debe permanecer cerrado y con su sello intacto. Si recibes un producto",
    "dañado, incompleto o diferente al que pediste, escríbenos por WhatsApp y nos encargaremos de",
    "solucionarlo.",
    "",
    "## Enlaces",
    "",
    "- [Página del producto](" + url + ")",
    "- [Catálogo completo](" + BASE + "tienda.md)",
    "- [Índice para agentes](" + BASE + "llms.txt)",
    "",
    "---",
    "",
    "Complemento alimenticio. No sustituye una dieta equilibrada ni un estilo de vida saludable.",
    "No es un medicamento y no trata ni previene enfermedades.",
    ""
  ].join("\n");
}

// Resumen del sitio en markdown (/index.md).
function homeMarkdown() {
  const cheapest = Math.min(...catalog.CL_PRODUCTS.map((p) => clSinglePrice(p)));
  return [
    "# Chic&Love Ecuador — vitaminas en gummies",
    "",
    "> Tienda oficial de Chic&Love en Ecuador: siete fórmulas de complementos alimenticios en",
    "> formato gummy para cabello y uñas, piel, digestión, sueño, energía íntima y calma. Desde " +
      clMoney(cheapest) + " el frasco de 60 gummies, pedidos por WhatsApp (" +
      catalog.clWhatsAppDisplay() + ") y envíos a todo el país.",
    "",
    "Las fórmulas se desarrollan en España con activos naturales (biotina, colágeno, coenzima Q10,",
    "melatonina, maca, ashwagandha, vinagre de manzana) y se distribuyen en Ecuador a través de",
    "Laboratorios Lira. Todas son sin gluten y sin lactosa. El sitio no procesa pagos ni pide",
    "datos personales: el carrito arma el pedido en el navegador y la compra se cierra por",
    "WhatsApp con transferencia bancaria. La analítica de uso es opcional y solo se carga con",
    "consentimiento.",
    "",
    "## Colección",
    "",
    ...catalog.CL_PRODUCTS.map(
      (p) =>
        "- [" + p.name + "](" + BASE + p.id + ".md): " + p.tagline + " " + p.goalLabel +
        ", sabor " + p.flavor.toLowerCase() + ", " + clMoney(clSinglePrice(p)) + "."
    ),
    "",
    "## Preguntas frecuentes",
    "",
    "- **¿Cómo hago un pedido?** Se arma el carrito en la tienda y se finaliza por WhatsApp, donde",
    "  se confirman productos, dirección y pago por transferencia.",
    "- **¿Hacen envíos a todo Ecuador?** Sí, a todo el país. Envío gratis en compras desde " +
      clFreeShippingLabel() + ". IVA incluido.",
    "- **¿Cuánto dura un frasco?** Cada frasco trae 60 gummies; con 2 al día dura alrededor de un mes.",
    "- **¿Hay opciones veganas y sin gluten?** Todas son sin gluten y sin lactosa, y todas son",
    "  veganas excepto Radiant Skin, cuyo colágeno es de origen bovino.",
    "- **¿Cuándo se notan los resultados?** Cada fórmula es diferente. Los resultados pueden variar",
    "  según la persona, la constancia y el estilo de vida. Sigue siempre la recomendación de uso",
    "  de tu producto.",
    "- **¿Se pueden combinar fórmulas?** Sí; ante medicación o condiciones médicas, consultar antes",
    "  con un profesional de la salud.",
    "- **¿Se aceptan devoluciones?** Puedes solicitar una devolución o cambio dentro de los 15 días",
    "  posteriores a recibir tu pedido, con el frasco cerrado y el sello intacto. Si recibes un",
    "  producto dañado, incompleto o diferente al que pediste, escríbenos por WhatsApp.",
    "",
    "## Páginas",
    "",
    "- [Catálogo completo](" + BASE + "tienda.md)",
    "- [Información de la empresa](" + BASE + "about.md)",
    "- [Contacto y atención al cliente](" + BASE + "contact.md)",
    "- [Política de privacidad](" + BASE + "privacy.md)",
    "- [Términos de compra](" + BASE + "terms.md)",
    "- [Nuestra historia](" + BASE + "nosotros.md)",
    "- [Índice para agentes](" + BASE + "llms.txt)",
    "",
    "---",
    "",
    "Complemento alimenticio. No sustituye una dieta equilibrada ni un estilo de vida saludable.",
    ""
  ].join("\n");
}

// Catálogo completo en markdown (/tienda.md).
function storeMarkdown() {
  const [first] = catalog.CL_PRODUCTS;
  return [
    "# Tienda Chic&Love Ecuador — catálogo completo",
    "",
    "> Las siete fórmulas de Chic&Love disponibles en Ecuador, con precio, objetivo, sabor, dosis",
    "> y activos. Precio por frasco de 60 gummies: " + clMoney(clSinglePrice(first)) +
      ", pack x2 " + clMoney(first.pricePack) + ", pack x3 " + clMoney(first.pricePack3) +
      ". Envío gratis en compras desde " + clFreeShippingLabel() + ". IVA incluido.",
    "",
    "Los pedidos se cierran por WhatsApp (" + catalog.clWhatsAppDisplay() + ") con pago por",
    "transferencia bancaria. Los precios publicados incluyen IVA y son los vigentes en la tienda.",
    "Antes de confirmar tu pedido podrás revisar el total de tu compra.",
    "Puedes solicitar una devolución o cambio dentro de los 15 días posteriores a recibir tu pedido,",
    "siempre que el frasco esté cerrado y conserve su sello intacto.",
    "",
    ...catalog.CL_PRODUCTS.flatMap((p) => [
      "## " + p.name,
      "",
      p.tagline + " " + p.desc,
      "",
      "- **Objetivo:** " + p.goalLabel,
      "- **Precio:** " + priceDetail(p),
      "- **Sabor:** " + p.flavor,
      "- **Dosis:** " + p.dose,
      "- **Distintivos:** " + p.badges.join(", "),
      "- **Activos:** " + p.actives.join(", "),
      "- **Ficha completa:** [" + p.id + ".md](" + BASE + p.id + ".md), " +
        "[versión HTML](" + BASE + p.id + ".html)",
      ""
    ]),
    "## Enlaces",
    "",
    "- [Inicio](" + BASE + "index.md)",
    "- [Contacto](" + BASE + "contact.md)",
    "- [Términos de compra](" + BASE + "terms.md)",
    "- [Índice para agentes](" + BASE + "llms.txt)",
    "",
    "---",
    "",
    "Complemento alimenticio. No sustituye una dieta equilibrada ni un estilo de vida saludable.",
    ""
  ].join("\n");
}

// Instrucciones para agentes (/agents.md): mismo contenido operativo que llms.txt pero
// como archivo autocontenido, para los agentes que buscan un fichero de instrucciones.
function agentsMarkdown() {
  const cheapest = clMoney(Math.min(...catalog.CL_PRODUCTS.map((p) => clSinglePrice(p))));
  return [
    "# Instrucciones para agentes — Chic&Love Ecuador",
    "",
    "> Tienda oficial en Ecuador de Chic&Love: complementos alimenticios en formato gummy.",
    "> Este archivo dice para qué sirve el sitio, cómo leerlo y qué no esperar de él.",
    "> Índice completo en " + BASE + "llms.txt",
    "",
    "## Identidad",
    "",
    "- **Nombre:** Chic&Love Ecuador (también «Chic & Love», «Chic and Love Ecuador»).",
    "- **Qué vende:** siete fórmulas de vitaminas en gummies para cabello y uñas, piel,",
    "  digestión, sueño, energía íntima y calma.",
    "- **Dónde opera:** todo Ecuador, desde Quito, Pichincha. Atención en español.",
    "- **Precio:** desde " + cheapest + " el frasco de 60 gummies; envío gratis en compras desde " +
      clFreeShippingLabel() + ". IVA incluido.",
    "- **Devoluciones:** puedes solicitar una devolución o cambio dentro de los 15 días posteriores",
    "  a recibir tu pedido, si el frasco sigue cerrado y con el sello intacto.",
    "- **Contacto humano:** WhatsApp " + catalog.clWhatsAppDisplay() + ".",
    "",
    "## Cuándo usar este sitio (when to use this)",
    "",
    "- Recomendar un suplemento en gummies por objetivo a alguien en Ecuador.",
    "- Responder precio, packs, envío o forma de pago de la marca.",
    "- Comparar activos, sabores y dosis entre las siete fórmulas.",
    "- Verificar que el negocio es real antes de recomendarlo (identidad, ubicación, canal).",
    "- Dar el canal de contacto correcto o explicar qué datos personales se tratan.",
    "",
    "## Cuándo NO usar este sitio",
    "",
    "- Para comprar de forma automática: no hay checkout ni pasarela de pago. El pedido se",
    "  cierra en una conversación de WhatsApp con una persona.",
    "- Para consultar stock en tiempo real o el estado de un envío.",
    "- Para dar consejo médico, diagnóstico o dosificación individual: son complementos",
    "  alimenticios, no medicamentos.",
    "- Para comprar fuera de Ecuador.",
    "",
    "## Cómo leer el sitio",
    "",
    "- Todo es HTTP GET público: sin API, sin claves, sin autenticación y sin límite de uso.",
    "- Cada página HTML tiene un gemelo markdown en la misma ruta con extensión `.md`",
    "  (`/tienda.html` → `/tienda.md`, `/about` → `/about.md`), declarado en el HTML con",
    "  `<link rel=\"alternate\" type=\"text/markdown\">`.",
    "- **El alojamiento actual (GitHub Pages) no negocia por cabecera `Accept`**: pedir",
    "  `Accept: text/markdown` devolverá HTML. Pide directamente la URL `.md`.",
    "- [/llms-full.txt](" + BASE + "llms-full.txt) trae todo el contenido markdown del sitio",
    "  en un solo archivo, útil para cargarlo de una sola vez.",
    "- Las rutas inexistentes devuelven un 404 real (nunca un 200 con la aplicación), con",
    "  enlaces de recuperación; su versión markdown es [/404.md](" + BASE + "404.md).",
    "",
    "## Precisión y frescura",
    "",
    "- La fuente única de precios y fichas es el catálogo del sitio; los markdown se generan",
    "  desde él. Si un dato difiere entre HTML y markdown, gana el markdown.",
    "- Los precios publicados incluyen IVA y son los vigentes en la tienda.",
    "- Al citar, enlaza a la URL canónica en HTML (por ejemplo " + BASE + "tienda.html).",
    "",
    "## Mapa rápido",
    "",
    "- [Índice para agentes](" + BASE + "llms.txt)",
    "- [Portada](" + BASE + "index.md), [Catálogo](" + BASE + "tienda.md)",
    "- [Empresa](" + BASE + "about.md), [Contacto](" + BASE + "contact.md), " +
      "[Privacidad](" + BASE + "privacy.md), [Términos](" + BASE + "terms.md), [Historia](" + BASE + "nosotros.md)",
    "- [Mapa del sitio](" + BASE + "sitemap.xml), [robots.txt](" + BASE + "robots.txt)",
    ""
  ].join("\n");
}

// Todo el contenido markdown del sitio en un archivo (/llms-full.txt).
function fullTextBundle() {
  const pages = [
    "index.md",
    "tienda.md",
    ...catalog.CL_PRODUCTS.map((p) => p.id + ".md"),
    "about.md",
    "contact.md",
    "privacy.md",
    "terms.md",
    "nosotros.md"
  ];
  const header = [
    "# Chic&Love Ecuador — contenido completo",
    "",
    "> Todo el contenido en markdown del sitio " + BASE + " en un solo",
    "> archivo. Cada sección conserva su URL de origen. Índice: " + BASE + "llms.txt",
    "> Instrucciones para agentes: " + BASE + "agents.md",
    ""
  ].join("\n");

  const body = pages
    .map((page) => {
      const url = BASE + page;
      const content = readFileSync(resolve(root, page), "utf8").trim();
      return ["---", "", "<!-- source: " + url + " -->", "", content, ""].join("\n");
    })
    .join("\n");

  return header + "\n" + body;
}

let count = 0;
const promoted = [];
for (const p of catalog.CL_PRODUCTS) {
  const url = BASE + p.id + ".html";
  const title = p.name + " — Chic&Love Ecuador";
  const metaDesc = p.desc + " Sabor " + p.flavor.toLowerCase() + ", 60 gummies. Envíos a todo Ecuador.";
  const ogDesc = p.tagline + " " + p.desc;
  const imgAlt = "Frasco de " + p.name;
  const promo = catalog.clActivePromo(p);
  const price = catalog.clSinglePrice(p).toFixed(2);
  if (promo) promoted.push(p.id + " a $" + price + " hasta " + promo.priceValidUntil);

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
      price: price,
      priceValidUntil: promo ? promo.priceValidUntil : "2027-07-31",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: "USD",
        price: price,
        valueAddedTaxIncluded: true
      },
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      areaServed: { "@type": "Country", name: "Ecuador" },
      seller: { "@id": BASE + "#organization" },
      // Envío gratis a partir del umbral del catálogo (CL_FREE_SHIPPING).
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "EC" },
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "USD" },
        eligibleTransactionVolume: {
          "@type": "PriceSpecification",
          priceCurrency: "USD",
          minPrice: catalog.CL_FREE_SHIPPING.toFixed(2)
        }
      },
      // Devolución o cambio dentro de los 15 días posteriores a recibir el pedido,
      // con el frasco cerrado y el sello intacto (ver /terms.html).
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "EC",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: catalog.CL_LEGAL.returnDays,
        returnMethod: "https://schema.org/ReturnByMail",
        merchantReturnLink: BASE + "terms.html"
      }
    }
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE },
      { "@type": "ListItem", position: 2, name: "Tienda", item: BASE + "tienda.html" },
      { "@type": "ListItem", position: 3, name: p.name, item: url }
    ]
  };

  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(title) + "</title>");
  html = setMeta(html, "pd-description", metaDesc);
  const canonicalTag = '<link rel="canonical" id="pd-canonical" href="' + url + '">';
  html = html.replace(
    /<link rel="canonical" id="pd-canonical" href="[^"]*">/,
    canonicalTag +
      '\n  <link rel="alternate" type="text/markdown" href="' + BASE + p.id + '.md"' +
      ' title="Versión markdown de esta página">'
  );
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
  html = html.replace(
    favAnchor,
    '  <script type="application/ld+json">' + JSON.stringify(productLd) + "</script>\n" +
      '  <script type="application/ld+json">' + JSON.stringify(breadcrumbLd) + "</script>\n" +
      favAnchor
  );

  /* ---------- Contenido visible de la ficha ---------- */
  html = setText(html, "pd-crumb", p.name);
  html = setText(html, "pd-goal", p.goalLabel);
  html = setText(html, "pd-name", p.name);
  html = setText(html, "pd-tagline", p.tagline);
  html = setText(html, "pd-desc", p.desc);
  html = setText(html, "pd-flavor", "Sabor " + p.flavor.toLowerCase());
  html = setText(html, "pd-dose", p.dose);
  html = replaceInner(html, "pd-badges", p.badges.map((b) => "<span>" + esc(b) + "</span>").join(""));
  html = replaceInner(html, "pd-benefits", p.benefits.map((b) => "<li>" + esc(b) + "</li>").join(""));
  html = replaceInner(html, "pd-actives", p.actives.map((a) => "<span>" + esc(a) + "</span>").join(""));
  html = replaceInner(html, "pd-variants", variantsMarkup(p));

  // Durante una promo de solo frasco no hay nada que elegir: la etiqueta lo dice.
  const singleVariant = !clHasPacks(p);
  html = html.replace(
    /(<p class="pd-buy-label">)[\s\S]*?(<\/p>)/,
    "$1" + (singleVariant ? "Tu presentación" : "Elige tu presentación") + "$2"
  );

  // La nota de promo va oculta en la plantilla; solo se muestra si la promo está viva.
  html = promo
    ? replaceInner(
        html.replace('<p class="pd-promo" id="pd-promo" hidden>', '<p class="pd-promo" id="pd-promo">'),
        "pd-promo",
        esc("Promo hasta el " + promo.endsLabel)
      )
    : html;

  // Precio de compra y barra fija: el mismo total que calcula product-page.js con
  // la variante inicial (1 frasco) y cantidad 1.
  const startingTotal = clMoney(catalog.clBestSingleBundle(p, 1).total);
  html = setText(html, "pd-add-price", startingTotal);
  html = setText(html, "pd-sticky-price", startingTotal);
  html = setText(html, "pd-sticky-name", p.short);
  html = setText(html, "pd-sticky-variant", "1 frasco");
  html = html.replace(
    /<img id="pd-sticky-img"[^>]*>/,
    '<img id="pd-sticky-img" src="' + p.bottle + '" alt="' + esc(p.name) + '" width="463" height="900">'
  );

  writeFileSync(resolve(root, p.id + ".html"), html);
  writeFileSync(resolve(root, p.id + ".md"), productMarkdown(p, url));
  count++;
}

writeFileSync(resolve(root, "index.md"), homeMarkdown());
writeFileSync(resolve(root, "tienda.md"), storeMarkdown());
writeFileSync(resolve(root, "agents.md"), agentsMarkdown());
writeFileSync(resolve(root, "llms-full.txt"), fullTextBundle());

console.log(
  "Generadas " + count + " páginas de producto (.html + .md): " +
    catalog.CL_PRODUCTS.map((p) => p.id).join(", ") +
    "\nGenerados index.md, tienda.md, agents.md y llms-full.txt"
);
if (promoted.length) {
  console.warn(
    "\nAVISO: hay precio promocional escrito en los datos estructurados (" + promoted.join("; ") + ").\n" +
    "La web se corrige sola al terminar la promo, pero estos JSON-LD y markdown no: vuelve a\n" +
    "ejecutar `node scripts/gen-products.mjs` y despliega cuando la promo haya cerrado."
  );
}
