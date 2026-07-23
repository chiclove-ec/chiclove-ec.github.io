/* Catálogo Chic&Love Ecuador — fuente única de datos del sitio.
   Los precios son editables aquí y se reflejan en todo el sitio. */
"use strict";

const CL_WHATSAPP = "593987591741"; // formato internacional sin espacios
const CL_INSTAGRAM = "chicloveec";
const CL_FREE_SHIPPING = 49.99;
const CL_JULY_PROMO_PRICE = 25.49;
const CL_JULY_PROMO_START = Date.parse("2026-07-01T00:00:00-05:00");
const CL_JULY_PROMO_END = Date.parse("2026-08-01T00:00:00-05:00");
const CL_PRODUCT_PRICING = Object.freeze({
  price: 29.99,
  pricePack: 49.99,
  pricePack3: 74.99
});

const CL_PRODUCTS = [
  {
    id: "hair-nails-forte",
    name: "Hair & Nails Forte",
    short: "Hair & Nails",
    tagline: "Cabello más fuerte. Uñas de acero.",
    desc: "La fórmula forte con biotina, ashwagandha y extracto de semilla de calabaza que frena la caída y acelera el crecimiento desde la raíz.",
    accent: "#8C6FC9",
    accentDark: "#6A4FA8",
    soft: "#F1EBFB",
    ...CL_PRODUCT_PRICING,
    flavor: "Arándanos",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-hair-nails.webp",
    splash: "assets/img/splash-hair-nails.webp",
    splashSmall: "assets/img/splash-hair-nails-640.webp",
    store: "assets/img/store-hair-nails.webp",
    storeSmall: "assets/img/store-hair-nails-640.webp",
    hero: "assets/img/hero-hair-nails.webp",
    heroSmall: "assets/img/hero-hair-nails-640.webp",
    splashWidth: 1160,
    goal: "cabello",
    goalLabel: "Cabello y uñas",
    benefits: [
      "Previene y frena la caída, acelera el crecimiento y engrosa la fibra capilar.",
      "Activa la microcirculación del cuero cabelludo: más nutrientes a los folículos pilosos.",
      "Crecimiento y fuerza visibles en cabello y uñas.",
      "El grupo de vitaminas B aumenta el flujo de sangre al cuero cabelludo para un pelo fuerte y brillante."
    ],
    actives: ["Biotina", "Vitamina B12", "Ácido fólico", "Vitamina A", "Vitamina D", "Ashwagandha", "Zinc"],
    dose: "2 gummies al día después de la comida",
    reviews: 214
  },
  {
    id: "radiant-skin",
    name: "Radiant Skin Vitamins",
    short: "Radiant Skin",
    tagline: "Tu piel, en modo glow.",
    desc: "Colágeno, coenzima Q10 y biotina en una gummy que ilumina, hidrata y devuelve la elasticidad a tu piel desde adentro.",
    accent: "#E88998",
    accentDark: "#B44F64",
    soft: "#FBEBEE",
    ...CL_PRODUCT_PRICING,
    flavor: "Frutos rojos",
    badges: ["Sin gluten", "Sin lactosa"],
    bottle: "assets/img/bottle-radiant-skin.webp",
    splash: "assets/img/splash-radiant-skin.webp",
    splashSmall: "assets/img/splash-radiant-skin-640.webp",
    store: "assets/img/store-radiant-skin.webp",
    storeSmall: "assets/img/store-radiant-skin-640.webp",
    hero: "assets/img/hero-radiant-skin.webp",
    heroSmall: "assets/img/hero-radiant-skin-640.webp",
    splashWidth: 946,
    goal: "piel",
    goalLabel: "Piel radiante",
    benefits: [
      "Potencia la luminosidad y vitalidad de la piel.",
      "El colágeno y la coenzima Q10 mejoran la elasticidad y combaten los signos de la edad.",
      "La biotina fortalece la barrera cutánea y aporta un glow saludable.",
      "Piel perfecta: hidratación y firmeza desde el interior."
    ],
    actives: ["Colágeno", "Coenzima Q10", "Biotina", "Vitamina C", "Vitamina E"],
    dose: "2 gummies al día",
    reviews: 189
  },
  {
    id: "vinagre-de-manzana",
    name: "Vinagre de Manzana",
    short: "Vinagre",
    tagline: "Digestión ligera.",
    desc: "Vinagre de manzana con extracto de jengibre: glucosa estable, digestión y control de peso — sin el sabor ácido del vinagre.",
    accent: "#35B34A",
    accentDark: "#1D712D",
    soft: "#E9F7EC",
    ...CL_PRODUCT_PRICING,
    flavor: "Manzana",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-acv.webp",
    splash: "assets/img/splash-acv.webp",
    splashSmall: "assets/img/splash-acv-640.webp",
    store: "assets/img/store-acv.webp",
    storeSmall: "assets/img/store-acv-640.webp",
    hero: "assets/img/hero-acv.webp",
    heroSmall: "assets/img/hero-acv-640.webp",
    splashWidth: 1118,
    goal: "digestion",
    goalLabel: "Digestión y balance",
    benefits: [
      "Ayuda a mantener estables los niveles de glucosa en sangre y facilita la digestión.",
      "Efecto probiótico que favorece la generación de bacterias saludables en el tracto intestinal.",
      "Regula la digestión y la microbiota, y reduce la hinchazón.",
      "Contribuye al control de peso y ayuda a absorber minerales y vitaminas."
    ],
    actives: ["Vinagre de manzana", "Extracto de jengibre"],
    dose: "2 gummies al día después de la comida",
    reviews: 176
  },
  {
    id: "sleep-vitamins",
    name: "Sleep Vitamins",
    short: "Sleep",
    tagline: "Duerme profundo. Despierta increíble.",
    desc: "Melatonina + vitamina B6 para conciliar el sueño rápido y disfrutar un descanso reparador que regenera piel y cabello mientras duermes.",
    accent: "#4FA8D8",
    accentDark: "#256A92",
    soft: "#E8F4FB",
    ...CL_PRODUCT_PRICING,
    flavor: "Fresa",
    badges: ["Sin gluten", "Sin azúcar", "Vegano"],
    bottle: "assets/img/bottle-sleep.webp",
    splash: "assets/img/splash-sleep.webp",
    splashSmall: "assets/img/splash-sleep-640.webp",
    store: "assets/img/store-sleep.webp",
    storeSmall: "assets/img/store-sleep-640.webp",
    hero: "assets/img/hero-sleep.webp",
    heroSmall: "assets/img/hero-sleep-640.webp",
    splashWidth: 955,
    goal: "sueno",
    goalLabel: "Sueño reparador",
    benefits: [
      "Ayuda a conciliar el sueño de manera rápida.",
      "Sueño reparador y profundo, noche tras noche.",
      "Protege la piel y el cabello del envejecimiento celular.",
      "Melatonina + B6: regenera las defensas de piel y pelo contra el estrés oxidativo."
    ],
    actives: ["Melatonina", "Vitamina B6"],
    dose: "1–3 gummies al día antes de dormir",
    reviews: 241
  },
  {
    id: "sexual-booster-women",
    name: "Sexual Booster Women",
    short: "Booster Her",
    tagline: "Enciende tu energía.",
    desc: "Maca y damiana 100% naturales que estabilizan tus canales de energía, estimulan la libido y reducen el estrés.",
    accent: "#B3538F",
    accentDark: "#8C3A6E",
    soft: "#F7EAF2",
    ...CL_PRODUCT_PRICING,
    flavor: "Cereza",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-sexual-w.webp",
    splash: "assets/img/splash-sexual-w.webp",
    splashSmall: "assets/img/splash-sexual-w-640.webp",
    store: "assets/img/store-sexual-w.webp",
    storeSmall: "assets/img/store-sexual-w-640.webp",
    hero: "assets/img/hero-sexual-w.webp",
    heroSmall: "assets/img/hero-sexual-w-640.webp",
    splashWidth: 1235,
    goal: "energia",
    goalLabel: "Energía íntima",
    benefits: [
      "Aumenta la libido y potencia el bienestar sexual.",
      "Mantiene en condiciones óptimas la ovulación.",
      "Impulso de energía y menos niveles de estrés.",
      "Maca y damiana: ingredientes activos 100% naturales."
    ],
    actives: ["Maca", "Damiana", "Ashwagandha"],
    dose: "2 gummies al día después del desayuno",
    reviews: 132
  },
  {
    id: "sexual-booster-men",
    name: "Sexual Booster Men",
    short: "Booster Him",
    tagline: "Rendimiento al máximo.",
    desc: "Maca y fenogreco para mejorar el rendimiento, la calidad del esperma y la fertilidad — energía estable todo el día.",
    accent: "#2E7FC2",
    accentDark: "#1F5C90",
    soft: "#E8F1FA",
    ...CL_PRODUCT_PRICING,
    flavor: "Cereza",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-sexual-m.webp",
    splash: "assets/img/splash-sexual-m.webp",
    splashSmall: "assets/img/splash-sexual-m-640.webp",
    store: "assets/img/store-sexual-m.webp",
    storeSmall: "assets/img/store-sexual-m-640.webp",
    hero: "assets/img/hero-sexual-m.webp",
    heroSmall: "assets/img/hero-sexual-m-640.webp",
    splashWidth: 1100,
    goal: "energia",
    goalLabel: "Energía íntima",
    benefits: [
      "Aumenta la libido y el rendimiento sexual.",
      "Mejora la calidad del esperma e incrementa la fertilidad.",
      "Estabiliza los canales de energía con maca.",
      "Ingredientes activos 100% naturales."
    ],
    actives: ["Maca", "Fenogreco", "Zinc", "L-arginina"],
    dose: "2 gummies al día después del desayuno",
    reviews: 118
  },
  {
    id: "anti-stress",
    name: "Anti-Stress Gummies",
    short: "Anti-Stress",
    tagline: "Serenidad para días intensos.",
    desc: "Ashwagandha, melisa y ginseng que regulan el cortisol para aliviar el estrés y la ansiedad, y ayudarte a fluir con el cambio.",
    accent: "#2B4FC7",
    accentDark: "#1D3894",
    soft: "#E9EDFA",
    ...CL_PRODUCT_PRICING,
    flavor: "Naranja",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-antistress.webp",
    splash: "assets/img/splash-antistress.webp",
    splashSmall: "assets/img/splash-antistress-640.webp",
    store: "assets/img/store-antistress.webp",
    storeSmall: "assets/img/store-antistress-640.webp",
    hero: "assets/img/hero-antistress.webp",
    heroSmall: "assets/img/hero-antistress-640.webp",
    splashWidth: 939,
    goal: "calma",
    goalLabel: "Calma y enfoque",
    benefits: [
      "Alivia estados de estrés y ansiedad.",
      "Favorece la relajación y la calma mental.",
      "Ayuda a adaptarte a situaciones de estrés o de cambio.",
      "La ashwagandha, planta adaptógena, regula los niveles de cortisol."
    ],
    actives: ["Ashwagandha", "Melisa", "Ginseng"],
    dose: "2 gummies al día después de la cena",
    reviews: 167
  }
];

const CL_GOALS = [
  { id: "todos", label: "Todos" },
  { id: "cabello", label: "Cabello y uñas" },
  { id: "piel", label: "Piel" },
  { id: "digestion", label: "Digestión" },
  { id: "sueno", label: "Sueño" },
  { id: "energia", label: "Energía íntima" },
  { id: "calma", label: "Calma" }
];

function clFindProduct(id) {
  return CL_PRODUCTS.find(function (p) { return p.id === id; }) || null;
}

function clCatalogMinimum(field) {
  return Math.min.apply(null, CL_PRODUCTS.map(function (product) { return product[field]; }));
}

function clCurrentSingleMinimum(now) {
  return Math.min.apply(null, CL_PRODUCTS.map(function (product) { return clSinglePrice(product, now); }));
}

function clWhatsAppDisplay() {
  if (/^593\d{9}$/.test(CL_WHATSAPP)) {
    return "+" + CL_WHATSAPP.slice(0, 3) + " " + CL_WHATSAPP.slice(3, 5) + " " + CL_WHATSAPP.slice(5, 8) + " " + CL_WHATSAPP.slice(8);
  }
  return "+" + CL_WHATSAPP;
}

function clWhatsAppUrl(message) {
  if (!/^\d{8,15}$/.test(CL_WHATSAPP)) return "";
  return "https://wa.me/" + CL_WHATSAPP + (message ? "?text=" + encodeURIComponent(message) : "");
}

function clInstagramUrl() {
  return "https://www.instagram.com/" + encodeURIComponent(CL_INSTAGRAM);
}

function clIsJulyPromoActive(now) {
  var timestamp = now instanceof Date ? now.getTime() : (typeof now === "number" ? now : Date.now());
  return timestamp >= CL_JULY_PROMO_START && timestamp < CL_JULY_PROMO_END;
}

function clSinglePrice(product, now) {
  return clIsJulyPromoActive(now) ? CL_JULY_PROMO_PRICE : product.price;
}

function clBestSingleBundle(product, quantity, now) {
  var qty = Math.min(Math.max(parseInt(quantity, 10) || 0, 0), 99);
  var singleCents = Math.round(clSinglePrice(product, now) * 100);
  var pack2Cents = Math.round(product.pricePack * 100);
  var pack3Cents = Math.round(product.pricePack3 * 100);
  var best = null;

  for (var packs3 = 0; packs3 <= Math.floor(qty / 3); packs3 += 1) {
    for (var packs2 = 0; packs2 <= Math.floor((qty - packs3 * 3) / 2); packs2 += 1) {
      var singles = qty - packs3 * 3 - packs2 * 2;
      var totalCents = packs3 * pack3Cents + packs2 * pack2Cents + singles * singleCents;
      var packedBottles = packs3 * 3 + packs2 * 2;
      if (!best || totalCents < best.totalCents || (totalCents === best.totalCents && packedBottles > best.packedBottles)) {
        best = {
          totalCents: totalCents,
          packedBottles: packedBottles,
          singles: singles,
          packs2: packs2,
          packs3: packs3
        };
      }
    }
  }

  return {
    total: best.totalCents / 100,
    savings: (singleCents * qty - best.totalCents) / 100,
    singles: best.singles,
    packs2: best.packs2,
    packs3: best.packs3
  };
}

function clMoney(n) {
  return "$" + n.toFixed(2);
}
