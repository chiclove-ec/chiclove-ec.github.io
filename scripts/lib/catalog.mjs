// Carga js/products.js (que es un script clásico del navegador) en un sandbox y expone
// el catálogo y sus helpers a las herramientas de Node: generador de páginas y tests.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadCatalog() {
  const source = readFileSync(resolve(projectRoot, "js/products.js"), "utf8").replace(
    /^\s*"use strict";/,
    ""
  );
  const catalog = {};
  new Function(
    "Date",
    source +
      "\nthis.CL_PRODUCTS=CL_PRODUCTS; this.CL_FREE_SHIPPING=CL_FREE_SHIPPING;" +
      "\nthis.CL_INSTAGRAM=CL_INSTAGRAM; this.CL_WHATSAPP=CL_WHATSAPP;" +
      "\nthis.clSinglePrice=clSinglePrice; this.clWhatsAppDisplay=clWhatsAppDisplay;" +
      "\nthis.clMoney=clMoney; this.clActivePromo=clActivePromo; this.clHasPacks=clHasPacks;" +
      "\nthis.clFreeShippingLabel=clFreeShippingLabel; this.clPromoPercent=clPromoPercent;" +
      "\nthis.clBestSingleBundle=clBestSingleBundle; this.CL_VAT_NOTE=CL_VAT_NOTE;" +
      "\nthis.CL_LEGAL=CL_LEGAL; this.clFooterLegal=clFooterLegal;" +
      "\nthis.CL_ACTIVES=CL_ACTIVES; this.clActiveInfo=clActiveInfo;" +
      "\nthis.CL_GOAL_GUIDE=CL_GOAL_GUIDE; this.CL_SERVINGS=CL_SERVINGS;" +
      "\nthis.CL_GOALS=CL_GOALS; this.CL_PRODUCT_PRICING=CL_PRODUCT_PRICING;" +
      "\nthis.clBottleDuration=clBottleDuration;"
  ).call(catalog, Date);
  return catalog;
}
