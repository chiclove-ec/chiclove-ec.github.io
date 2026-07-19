/* Catálogo Chic&Love Ecuador — fuente única de datos del sitio.
   Los precios son editables aquí y se reflejan en todo el sitio. */
"use strict";

const CL_WHATSAPP = "593984012787"; // 0984012787 en formato internacional
const CL_INSTAGRAM = "chicloveec";

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
    price: 27.9,
    pricePack: 47.9,
    flavor: "Frutos rojos",
    badges: ["Sin gluten", "Sin lactosa", "Vegetariano"],
    bottle: "assets/img/bottle-hair-nails.webp",
    splash: "assets/img/splash-hair-nails.webp",
    goal: "cabello",
    goalLabel: "Cabello y uñas",
    benefits: [
      "Previene y frena la caída, acelera el crecimiento y engrosa la fibra capilar.",
      "Activa la microcirculación del cuero cabelludo: más nutrientes a los folículos pilosos.",
      "Crecimiento y fuerza visibles en cabello y uñas.",
      "El grupo de vitaminas B aumenta el flujo de sangre al cuero cabelludo para un pelo fuerte y brillante."
    ],
    actives: ["Biotina", "Vitamina B12", "Ácido fólico", "Vitamina A", "Vitamina D", "Ashwagandha", "Zinc"],
    dose: "2 gummies al día",
    rating: 4.9,
    reviews: 214
  },
  {
    id: "radiant-skin",
    name: "Radiant Skin Vitamins",
    short: "Radiant Skin",
    tagline: "Tu piel, en modo glow.",
    desc: "Colágeno, coenzima Q10 y biotina en una gomita que ilumina, hidrata y devuelve la elasticidad a tu piel desde adentro.",
    accent: "#E88998",
    accentDark: "#B44F64",
    soft: "#FBEBEE",
    price: 27.9,
    pricePack: 47.9,
    flavor: "Frutos rojos",
    badges: ["Sin gluten", "Sin lactosa"],
    bottle: "assets/img/bottle-radiant-skin.webp",
    splash: "assets/img/splash-radiant-skin.webp",
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
    rating: 4.8,
    reviews: 189
  },
  {
    id: "vinagre-de-manzana",
    name: "Vinagre de Manzana ACV",
    short: "Apple Cider",
    tagline: "Digestión ligera. Energía limpia.",
    desc: "ACV con extracto de jengibre: glucosa estable, digestión feliz y control de peso — sin el sabor ácido del vinagre.",
    accent: "#35B34A",
    accentDark: "#238536",
    soft: "#E9F7EC",
    price: 25.9,
    pricePack: 44.9,
    flavor: "Manzana",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-acv.webp",
    splash: "assets/img/splash-acv.webp",
    goal: "digestion",
    goalLabel: "Digestión y balance",
    benefits: [
      "Ayuda a mantener estables los niveles de glucosa en sangre y facilita la digestión.",
      "Efecto probiótico que favorece la generación de bacterias saludables en el tracto intestinal.",
      "El jengibre desinflama la microbiota: menos gases, menos hinchazón, adiós toxinas.",
      "Contribuye al control de peso y ayuda a absorber minerales y vitaminas."
    ],
    actives: ["Vinagre de manzana", "Extracto de jengibre", "Vitamina B12"],
    dose: "2 gummies en ayunas, o 1 después de la comida",
    rating: 4.8,
    reviews: 176
  },
  {
    id: "sleep-vitamins",
    name: "Sleep Vitamins",
    short: "Sleep",
    tagline: "Duerme profundo. Despierta increíble.",
    desc: "Melatonina + vitamina B6 para conciliar el sueño rápido y disfrutar un descanso reparador que regenera piel y cabello mientras duermes.",
    accent: "#4FA8D8",
    accentDark: "#2F7FAD",
    soft: "#E8F4FB",
    price: 26.9,
    pricePack: 45.9,
    flavor: "Fresa",
    badges: ["Sin gluten", "Sin azúcar", "Vegano"],
    bottle: "assets/img/bottle-sleep.webp",
    splash: "assets/img/splash-sleep.webp",
    goal: "sueno",
    goalLabel: "Sueño reparador",
    benefits: [
      "Ayuda a conciliar el sueño de manera rápida.",
      "Sueño reparador y profundo, noche tras noche.",
      "Protege la piel y el cabello del envejecimiento celular.",
      "Melatonina + B6: regenera las defensas de piel y pelo contra el estrés oxidativo."
    ],
    actives: ["Melatonina", "Vitamina B6"],
    dose: "1–3 gummies antes de dormir según tu patrón de sueño",
    rating: 4.9,
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
    price: 29.9,
    pricePack: 52.9,
    flavor: "Cereza",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-sexual-w.webp",
    splash: "assets/img/splash-sexual-w.webp",
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
    rating: 4.7,
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
    price: 29.9,
    pricePack: 52.9,
    flavor: "Cereza",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-sexual-m.webp",
    splash: "assets/img/splash-sexual-m.webp",
    goal: "energia",
    goalLabel: "Energía íntima",
    benefits: [
      "Aumenta la libido y el rendimiento sexual.",
      "Mejora la calidad del esperma e incrementa la fertilidad.",
      "Estabiliza los canales de energía con maca y damiana.",
      "Ingredientes activos 100% naturales."
    ],
    actives: ["Maca", "Fenogreco", "Zinc"],
    dose: "2 gummies al día después del desayuno",
    rating: 4.7,
    reviews: 118
  },
  {
    id: "anti-stress",
    name: "Anti-Stress Gummies",
    short: "Anti-Stress",
    tagline: "Calma mental, en serio.",
    desc: "Ashwagandha, melisa y ginseng que regulan el cortisol para aliviar el estrés y la ansiedad, y ayudarte a fluir con el cambio.",
    accent: "#2B4FC7",
    accentDark: "#1D3894",
    soft: "#E9EDFA",
    price: 26.9,
    pricePack: 45.9,
    flavor: "Naranja",
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    bottle: "assets/img/bottle-antistress.webp",
    splash: "assets/img/splash-antistress.webp",
    goal: "calma",
    goalLabel: "Calma y foco",
    benefits: [
      "Alivia estados de estrés y ansiedad.",
      "Favorece la relajación y la calma mental.",
      "Ayuda a adaptarte a situaciones de estrés o de cambio.",
      "La ashwagandha, planta adaptógena, regula los niveles de cortisol."
    ],
    actives: ["Ashwagandha", "Melisa", "Ginseng"],
    dose: "2 gummies al día en periodos de estrés",
    rating: 4.8,
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

function clMoney(n) {
  return "$" + n.toFixed(2);
}
