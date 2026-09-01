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

const BASE = "https://chiclove-ec.github.io/";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const catalog = loadCatalog();
const { clMoney, clSinglePrice } = catalog;

const template = readFileSync(resolve(root, "producto.html"), "utf8");
const setMeta = (html, id, value) =>
  html.replace(new RegExp('(<meta [^>]*id="' + id + '"[^>]*content=")[^"]*(")'), "$1" + esc(value) + "$2");

// Gemelo markdown que se sirve en /<id>.md y por `Accept: text/markdown`.
function productMarkdown(p, url) {
  const whatsapp = catalog.clWhatsAppDisplay();
  return [
    "# " + p.name + " — Chic&Love Ecuador",
    "",
    "> " + p.tagline + " " + p.desc,
    "",
    "- **Precio:** " + clMoney(clSinglePrice(p)) + " por frasco de 60 gummies · pack x2 " +
      clMoney(p.pricePack) + " · pack x3 " + clMoney(p.pricePack3),
    "- **Disponibilidad:** en stock, envíos a todo Ecuador (gratis desde " +
      clMoney(catalog.CL_FREE_SHIPPING) + ")",
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
    "El pedido se cierra por WhatsApp (" + whatsapp + "): confirmamos disponibilidad, precio final",
    "y datos de envío, y el pago se hace por transferencia bancaria. Los precios publicados son",
    "referenciales hasta esa confirmación. Ver [/contact.md](" + BASE + "contact.md).",
    "",
    "**Devoluciones:** no se aceptan devoluciones ni cambios por decisión del cliente, por tratarse",
    "de un producto alimenticio. Si el pedido llega dañado, incompleto o equivocado, se resuelve por",
    "WhatsApp.",
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
    "- **¿Hacen envíos a todo Ecuador?** Sí, a todo el país; gratis desde " +
      clMoney(catalog.CL_FREE_SHIPPING) + ".",
    "- **¿Cuánto dura un frasco?** Cada frasco trae 60 gummies; con 2 al día dura alrededor de un mes.",
    "- **¿Hay opciones veganas y sin gluten?** Todas son sin gluten y sin lactosa, y todas son",
    "  veganas excepto Radiant Skin, cuyo colágeno es de origen bovino.",
    "- **¿Cuándo se notan los resultados?** Con uso diario y constante, habitualmente entre la",
    "  cuarta y la octava semana.",
    "- **¿Se pueden combinar fórmulas?** Sí; ante medicación o condiciones médicas, consultar antes",
    "  con un profesional de la salud.",
    "- **¿Se aceptan devoluciones?** No. Por tratarse de un producto alimenticio no se aceptan",
    "  devoluciones ni cambios por decisión del cliente; los pedidos dañados, incompletos o",
    "  equivocados se resuelven por WhatsApp.",
    "",
    "## Páginas",
    "",
    "- [Catálogo completo](" + BASE + "tienda.md)",
    "- [Información de la empresa](" + BASE + "about.md)",
    "- [Contacto y atención al cliente](" + BASE + "contact.md)",
    "- [Política de privacidad](" + BASE + "privacy.md)",
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
      " · pack x2 " + clMoney(first.pricePack) + " · pack x3 " + clMoney(first.pricePack3) +
      ". Envío gratis desde " + clMoney(catalog.CL_FREE_SHIPPING) + ".",
    "",
    "Los pedidos se cierran por WhatsApp (" + catalog.clWhatsAppDisplay() + ") con pago por",
    "transferencia bancaria. Los precios publicados son referenciales hasta esa confirmación.",
    "No se aceptan devoluciones ni cambios por decisión del cliente: es un producto alimenticio.",
    "",
    ...catalog.CL_PRODUCTS.flatMap((p) => [
      "## " + p.name,
      "",
      p.tagline + " " + p.desc,
      "",
      "- **Objetivo:** " + p.goalLabel,
      "- **Precio:** " + clMoney(clSinglePrice(p)) + " · pack x2 " + clMoney(p.pricePack) +
        " · pack x3 " + clMoney(p.pricePack3),
      "- **Sabor:** " + p.flavor,
      "- **Dosis:** " + p.dose,
      "- **Distintivos:** " + p.badges.join(", "),
      "- **Activos:** " + p.actives.join(", "),
      "- **Ficha completa:** [" + p.id + ".md](" + BASE + p.id + ".md) · " +
        "[versión HTML](" + BASE + p.id + ".html)",
      ""
    ]),
    "## Enlaces",
    "",
    "- [Inicio](" + BASE + "index.md)",
    "- [Contacto](" + BASE + "contact.md)",
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
    "> Índice completo en https://chiclove-ec.github.io/llms.txt",
    "",
    "## Identidad",
    "",
    "- **Nombre:** Chic&Love Ecuador (también «Chic & Love», «Chic and Love Ecuador»).",
    "- **Qué vende:** siete fórmulas de vitaminas en gummies para cabello y uñas, piel,",
    "  digestión, sueño, energía íntima y calma.",
    "- **Dónde opera:** todo Ecuador, desde Tumbaco (Quito, Pichincha). Atención en español.",
    "- **Precio:** desde " + cheapest + " el frasco de 60 gummies; envío gratis desde " +
      clMoney(catalog.CL_FREE_SHIPPING) + ".",
    "- **Devoluciones:** no se aceptan por decisión del cliente (producto alimenticio); los",
    "  pedidos dañados, incompletos o equivocados se resuelven por WhatsApp.",
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
    "- Los precios publicados son referenciales: se confirman por WhatsApp antes de cobrar.",
    "- Al citar, enlaza a la URL canónica en HTML (por ejemplo " + BASE + "tienda.html).",
    "",
    "## Mapa rápido",
    "",
    "- [Índice para agentes](" + BASE + "llms.txt)",
    "- [Portada](" + BASE + "index.md) · [Catálogo](" + BASE + "tienda.md)",
    "- [Empresa](" + BASE + "about.md) · [Contacto](" + BASE + "contact.md) · " +
      "[Privacidad](" + BASE + "privacy.md) · [Historia](" + BASE + "nosotros.md)",
    "- [Mapa del sitio](" + BASE + "sitemap.xml) · [robots.txt](" + BASE + "robots.txt)",
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
    "nosotros.md"
  ];
  const header = [
    "# Chic&Love Ecuador — contenido completo",
    "",
    "> Todo el contenido en markdown del sitio https://chiclove-ec.github.io/ en un solo",
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
for (const p of catalog.CL_PRODUCTS) {
  const url = BASE + p.id + ".html";
  const title = p.name + " — Chic&Love Ecuador";
  const metaDesc = p.desc + " Sabor " + p.flavor.toLowerCase() + ", 60 gummies. Envíos a todo Ecuador.";
  const ogDesc = p.tagline + " " + p.desc;
  const imgAlt = "Frasco de " + p.name;

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
      price: p.price.toFixed(2),
      priceValidUntil: "2027-07-31",
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
      // Producto alimenticio: no se aceptan devoluciones por decisión del cliente.
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "EC",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
        merchantReturnLink: BASE + "contact.html"
      }
    }
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
  html = html.replace(favAnchor, '  <script type="application/ld+json">' + JSON.stringify(productLd) + "</script>\n" + favAnchor);

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
